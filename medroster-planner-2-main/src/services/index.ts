import { staffService, userService } from '../api/staff';
import { leaveService } from '../api/leave';
import { 
  rosterService, swapService, settingsService, 
  conflictService, shiftTemplateService, availabilityService 
} from '../api/roster';
import { notificationService } from '../api/notification';
import { authService } from '../api/auth';

// Re-export services to maintain 100% backward compatibility
export {
  staffService,
  userService,
  leaveService,
  rosterService,
  swapService,
  settingsService,
  conflictService,
  shiftTemplateService,
  availabilityService,
  notificationService,
  authService
};

// Compatibility export for support service
export const supportService = {
  submit: async (data: any) => {
    return { success: true };
  }
};
