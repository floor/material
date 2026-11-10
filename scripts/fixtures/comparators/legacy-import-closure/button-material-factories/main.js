import 'material/styles/base';
import 'material/styles/button';
import { createButton } from 'material';
const made = [createButton({})];
for (const c of made) document.body.append(c.element);
