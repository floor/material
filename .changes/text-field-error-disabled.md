Section: Fixed

**Text field: a disabled field in error uses the disabled colour.** The label, helper and counter of a field that is both disabled and in error were painted error, faded to 0.38. They now use on-surface at 0.38, which is the disabled role. An enabled field in error stays error. The indicator, the outline and the trailing icon were already the disabled role (`TextFieldDefaults` `labelColor` and `supportingTextColor`, material3 1.4.0: the disabled role is chosen before the error role).
