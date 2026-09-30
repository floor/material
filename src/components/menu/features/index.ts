// src/components/menu/features/index.ts

// Individual feature imports. The submenu feature is not among them: it is
// loaded on demand by the controller (see ./loader), and a static import here
// would put it back into every menu's initial bundle.
import withController from './controller';
import withOpener from './opener';
import withPosition from './position';
import withKeyboard from './keyboard';

// Export features
export {
  withController,
  withOpener,
  withPosition,
  withKeyboard
};
