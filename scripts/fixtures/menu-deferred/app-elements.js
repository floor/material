import {
  defineButton, defineTextField, defineCheckbox, defineSwitch, defineRadios, defineSelect,
  defineDialog, defineTabs, defineList, defineChips, defineProgress, defineIconButton,
  defineFab, defineSlider, defineDivider,
} from 'material/elements';
export function mount() {
  for (const define of [defineButton, defineTextField, defineCheckbox, defineSwitch, defineRadios,
    defineSelect, defineDialog, defineTabs, defineList, defineChips, defineProgress,
    defineIconButton, defineFab, defineSlider, defineDivider]) define();
  document.body.innerHTML = '<button id="opener">Menu</button><m-button>Save</m-button>' +
    '<m-text-field label="Name"></m-text-field><m-checkbox>Agree</m-checkbox><m-switch>Wi-Fi</m-switch>' +
    '<m-radios name="choice"><m-radio value="a">A</m-radio></m-radios><m-select label="Destination">' +
    '<m-select-option value="paris">Paris</m-select-option></m-select><m-dialog title="Confirm">Continue?</m-dialog>' +
    '<m-tabs><m-tab value="overview">Overview</m-tab></m-tabs><m-list><m-list-item>Item</m-list-item></m-list>' +
    '<m-chips><m-chip value="filter">Filter</m-chip></m-chips><m-progress value="50"></m-progress>' +
    '<m-icon-button aria-label="Add"></m-icon-button><m-fab aria-label="Add"></m-fab>' +
    '<m-slider value="50"></m-slider><m-divider></m-divider><m-menu anchor="opener">' +
    '<m-menu-item value="one">One</m-menu-item></m-menu>';
  return { anchor: document.querySelector('#opener'), host: document.querySelector('m-menu') };
}
