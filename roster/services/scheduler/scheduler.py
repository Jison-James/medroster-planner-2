from datetime import date, timedelta
from typing import Dict, Tuple, List
from ...models import Roster, RosterAssignment, Conflict
from .data_loader import DataLoader
from .candidate_pool import CandidatePool
from .constraint_engine import ConstraintEngine
from .fairness_engine import FairnessEngine
from .rotation_engine import RotationEngine
from .scoring_engine import ScoringEngine
from .assignment_engine import AssignmentEngine
from .conflict_engine import ConflictEngine
from .transaction_manager import TransactionManager

class SchedulerService:
    @TransactionManager.execute
    def generate(self, start_date: date, end_date: date, requirements: Dict[str, Dict[str, int]]) -> Tuple[Roster, List[RosterAssignment]]:
        loader = DataLoader()
        context = loader.load(start_date, end_date, requirements)

        roster_name = f"Roster ({start_date} to {end_date})"
        roster = Roster.objects.create(
            name=roster_name,
            start_date=start_date,
            end_date=end_date,
            status='Draft'
        )

        pool = CandidatePool(context.staff_profiles)
        constraints = ConstraintEngine()
        fairness = FairnessEngine(context)
        rotation = RotationEngine(context)
        scorer = ScoringEngine(context, fairness, rotation)
        assigner = AssignmentEngine(context, fairness, rotation)
        
        understaffed_conflicts = []

        current_day = start_date
        while current_day <= end_date:
            for s_type in ['morning', 'evening', 'night']:
                template = context.templates.get(s_type)
                if not template:
                    continue
                    
                reqs = requirements.get(s_type, {})
                for role_name, quota in reqs.items():
                    candidates = pool.get_candidates(role_name)
                    
                    assigned_count = 0
                    scored_candidates = []
                    
                    for staff in candidates:
                        if constraints.is_valid(staff, current_day, template, context):
                            score = scorer.score(staff, current_day, template)
                            scored_candidates.append((score, staff))
                            
                    scored_candidates.sort(key=lambda x: x[0], reverse=True)
                    
                    for score, staff in scored_candidates:
                        if assigned_count >= quota:
                            break
                            
                        assigner.create_assignment(roster, staff, current_day, template)
                        assigned_count += 1
                        
                    if assigned_count < quota:
                        understaffed_conflicts.append(Conflict(
                            roster=roster,
                            conflict_type='Understaffed_Shift',
                            message=f"Understaffed shift: Assigned {assigned_count} out of {quota} required {role_name}s for {s_type.capitalize()} shift on {current_day}.",
                            severity='Warning',
                            date=current_day,
                            status='Open'
                        ))

            current_day += timedelta(days=1)

        created_shifts = RosterAssignment.objects.bulk_create(assigner.created_shifts)
        
        conflict_engine = ConflictEngine()
        detected_conflicts = conflict_engine.detect_conflicts(roster, created_shifts)
        
        all_conflicts = understaffed_conflicts + detected_conflicts
        
        if all_conflicts:
            Conflict.objects.bulk_create(all_conflicts)

        return roster, created_shifts
