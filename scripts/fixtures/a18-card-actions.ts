import createButton from '../../src/components/button';
import createCard, {createCardActions, createCardContent, createCardHeader, createCardMedia} from '../../src/components/card';
import {defineButton} from '../../src/elements/button';
import {defineCard} from '../../src/elements/card';
import {registerStyles, hasStyles} from '../../src/elements/styles';

const css = await fetch('/shadow-styles.json').then(response => response.json()) as Record<string, string>;
registerStyles(css);
for (const name of ['ripple', 'button', 'progress', 'card']) {
  if (!hasStyles(name) || !css[name].includes('.mtrl-')) throw new Error(`Missing real shadow CSS: ${name}`);
}
defineButton();
defineCard();

const mount = <T extends {element: HTMLElement}>(id: string, component: T): T => {
  component.element.id = id;
  document.querySelector('#stage')!.append(component.element);
  return component;
};

const promotedActivation = {card: 0, action: 0};
const plainActivation = {card: 0};
const plain = mount('card-promoted-plain', createCard({
  clickable: true,
  promoteChildActions: true,
  header: {title: 'Promoted plain card'},
  content: {text: 'Plain body'},
}));
plain.on('click', () => plainActivation.card++);
const detail = createButton({text: 'Promoted detail'});
detail.on('click', () => promotedActivation.action++);
const withActions = mount('card-actions-promoted', createCard({
  clickable: true,
  promoteChildActions: true,
  header: {title: 'Promoted card with actions'},
  actions: {actions: [detail.element]},
}));
withActions.on('click', () => promotedActivation.card++);
mount('card-buttons-promoted', createCard({
  clickable: true,
  promoteChildActions: true,
  header: {title: 'Promoted shorthand card'},
  buttons: [{text: 'Promoted shorthand detail'}],
}));

document.querySelector('#stage')!.insertAdjacentHTML('beforeend',
  '<m-card id="card-element-actions-promoted" clickable promote-child-actions headline="Promoted element card"><m-button slot="actions">Promoted element detail</m-button></m-card>');

const exerciseWarning = (part: string, clickable = true, promoteChildActions = false) => {
  const card = createCard({clickable, promoteChildActions, header: {title: 'Dynamic card'}});
  document.querySelector('#stage')!.append(card.element);
  const button = document.createElement('button');
  button.textContent = 'Dynamic action';
  if (part === 'header') card.setHeader(createCardHeader({title: 'Dynamic card', action: button}));
  else if (part === 'content') card.addContent(createCardContent({children: [button]}));
  else if (part === 'media') card.addMedia(createCardMedia({element: button}));
  else card.setActions(createCardActions({actions: [button]}));
  const result = {
    role: card.element.getAttribute('role'),
    tabIndex: card.element.tabIndex,
    tabindex: card.element.getAttribute('tabindex'),
    action: button.outerHTML,
  };
  card.destroy();
  return result;
};

Object.assign(window, {mtrlA18: {promotedActivation, plainActivation, exerciseWarning}, ready: true});
