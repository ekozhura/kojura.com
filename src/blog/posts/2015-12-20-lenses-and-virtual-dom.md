---
layout: post.hbt
author: Hardy Jones
title: "Линзы, ramda, virtual DOM и принцип открытости/закрытости."
alias: lenses-and-virtual-dom
date: 2015-12-20 18:31:44 +0200
collection: posts
header_image: gifs/andromeda.strain.002.gif
---

Вольный перевод статьи [Hardy Jones](http://joneshf.github.io/) ["Lenses and Virtual DOM Support Open Closed"](http://joneshf.github.io/programming/2015/12/19/Lenses-and-Virtual-DOM-Support-Open-Closed.html), посвященной использованию линз.

---

Предполагается кое-какое понимание линз ван Лаарховена, [ramda](http://ramdajs.com/) и [virtual-dom](https://github.com/Matt-Esch/virtual-dom). 

### Интро

Рассмотрим гипотетический сценарий

* Остался час до конца рабочей недели.
* Ты работаешь над большим javascript проектом, не покрытым тестами.
* В этом проекте есть функция, которая создает радиокнопку; она принимает какие-то параметры, и возвращает объект `VNode`.
* Должна быть возможность делать радиокнопку недоступной - это и есть твоя задача.
* Функция пока что не учитывает атрибут `disabled`.
* Эта функция используется в разных частях проекта.

Если не обращать внимание на безумный факт отсутствия тестов на проекте и идиотские требования в конце пятницы выкатить фичу, как бы ты выходил из ситуации? Есть несколько вариантов:

* Ты мог бы переписать функцию так, чтобы она поддерживала аттрибут `disabled`, и поправить все вызовы этой функции. Проблема в том, что такой подход нарушает [принцип открытости/закрытости](https://ru.wikipedia.org/wiki/%D0%9F%D1%80%D0%B8%D0%BD%D1%86%D0%B8%D0%BF_%D0%BE%D1%82%D0%BA%D1%80%D1%8B%D1%82%D0%BE%D1%81%D1%82%D0%B8/%D0%B7%D0%B0%D0%BA%D1%80%D1%8B%D1%82%D0%BE%D1%81%D1%82%D0%B8). Плюс, ты пишешь на javascript и не пишешь тесты, так что полагаешься только удачу. А еще это значит, что у тебя должны быть права на правки по всему проекту.
* Ты мог бы скопировать функцию и создать новую, которая будет поддерживать аттрибут `disabled`. Самый простой способ. Оригинального кода ты не касаешься ценой минимального дублирования кода. Цитируя [Сэнди Мэтц](http://www.sandimetz.com/) ["дублирование кода обходится дешевле плохой абстракции"](https://www.youtube.com/watch?v=8bZh5LMaSmE&feature=youtu.be&t=14m52s). На самом деле, не худший вариант с учетом того, что ты и твоя команда знают, когда нужно завязывать с дублированием и переходить к абстрагированию.
* Ты мог бы положиться на javascript, добавив необязательный параметр к функции. Похожий на первый вариант, с тем отличием что тебе не придется править все вызовы функции. Но это наверное последнее что тебе бы хотелось делать в коде, не покрытом тестами.

### Цель

Есть и другие варианты. Один из них - использование линз для выполнения принципа открытости/закрытости. В частности, линз ван Лаарховена реализованных в рамде. Если ты не знаком с линзами, это типа сеттеры и геттеры, которые являются объектами первого класса.

Примеры использования:

```js
view(bar, foo); // => foo.bar;

view(bar, 3, foo); // => foo.bar = 3;

view(compose(bar, baz, quux), foo); // => foo.bar.baz.quux;

set(compose(bar, baz, quux), 3, foo); // => foo.bar.baz.quux = 3;

```

Выглядит многословно, но так и бывает при рассмотрении простых примеров. 

### Простая радиокнопка

Сперва, та самая функция:

```js
import {h} from 'virtual-dom';

function radio(name, value, description, actualValue) {
  return h('input', {
    checked: value === actualValue,
    type: 'radio',
    value
  }, description);
}
```

Структура возвращаемого объекта `VNode`:

```js
> radio('foo', 'bar', 'Bar', 'bar');
VirtualNode {
  tagName: 'input',
  properties:
   { checked: true,
     type: 'radio',
     value: SoftSetHook { value: 'bar' } },
  children: [ VirtualText { text: 'Bar' } ],
  key: undefined,
  namespace: null,
  count: 1,
  hasWidgets: false,
  hasThunks: false,
  hooks: undefined,
  descendantHooks: false }
> radio('foo', 'baz', 'Baz', 'bar');
VirtualNode {
  tagName: 'input',
  properties:
   { checked: false,
     type: 'radio',
     value: SoftSetHook { value: 'baz' } },
  children: [ VirtualText { text: 'Baz' } ],
  key: undefined,
  namespace: null,
  count: 1,
  hasWidgets: false,
  hasThunks: false,
  hooks: undefined,
  descendantHooks: false }
```

`VNode` это обычный объект, он не изменяет DOM. Значит, с ним можно работать так же, как и с любым другим значением в javascript.

У `VNode` есть свойство `properties`, содержащее атрибуты соответствующего DOM элемента. К уже существующим `checked`, `type`, `value` осталось добавить `disabled`.

### Линзы

Тут в игру вступают линзы. У ramda на этот случай есть две функции: `lensProp` для фокуса на свойстве объекта, и `lensIndex` для фокуса на индексе массива.

Задаем свойство радиокнопки `disabled` с помощью `lensProp`:

```js
import {compose, lensProp, set} from 'ramda';

const properties = lensProp('properties');
const disabled = lensProp('disabled');
const propsDisabled = compose(properties, disabled);
const disable = set(propsDisabled, true);
```

Создали две линзы и с помощью `compose` комбинируем их. Обрати внимание, что при композиции линз их порядок - слева направо, в отличии от композиции функций, где порядок справа налево. С трандюсерами точно так же (как и должно быть, ведь они - упрощенная версия линз ван Лаарховена).

В результате:

```js
> const bar = radio('foo', 'bar', 'Bar', 'bar');
> bar
VirtualNode {
  tagName: 'input',
  properties:
   { checked: true,
     type: 'radio',
     value: SoftSetHook { value: 'bar' } },
  children: [ VirtualText { text: 'Bar' } ],
  key: undefined,
  namespace: null,
  count: 1,
  hasWidgets: false,
  hasThunks: false,
  hooks: undefined,
  descendantHooks: false }
> disable(bar)
{ tagName: 'input',
  properties:
   { checked: true,
     type: 'radio',
     value: SoftSetHook { value: 'bar' },
     disabled: true },
  children: [ VirtualText { text: 'Bar' } ],
  key: undefined,
  namespace: null,
  count: 1,
  hasWidgets: false,
  hasThunks: false,
  hooks: undefined,
  descendantHooks: false,
  version: '1',
  type: 'VirtualNode' }
```

Не считая минимальной разницы в представлении двух объектов в консоли, единственное, что изменилось - появилось новое свойство `disabled` со значением `true`. Отлично.

Так же, обрати внимание, что изначально созданный `VNode` не изменился:  

```js
> bar
VirtualNode {
  tagName: 'input',
  properties:
   { checked: true,
     type: 'radio',
     value: SoftSetHook { value: 'bar' } },
  children: [ VirtualText { text: 'Bar' } ],
  key: undefined,
  namespace: null,
  count: 1,
  hasWidgets: false,
  hasThunks: false,
  hooks: undefined,
  descendantHooks: false }
```

Теперь не придется волноваться, что что-то где-то может отвалиться при изменении объекта. И да, не пришлось ничего менять внутрии функции `radio`. Можно ее вообще куда-то вынести, учитывая относительную простоту добавления свойств.

### Легкий путь

Стоило ли вообще тащить в эту задачу линзы? Признаю, что для такого простого примера этот инструмент не оправдывает себя. Можно ведь было сделать так:

```js
function disableMutation(vnode) {
  vnode.properties.disabled = true;
  return vnode;
}
```

Простое и понятное решение, и релизовано на чистом javascript. И результат тот же:

```js
> disableMutation(bar)
VirtualNode {
  tagName: 'input',
  properties:
   { checked: true,
     type: 'radio',
     value: SoftSetHook { value: 'bar' },
     disabled: true },
  children: [ VirtualText { text: 'Bar' } ],
  key: undefined,
  namespace: null,
  count: 1,
  hasWidgets: false,
  hasThunks: false,
  hooks: undefined,
  descendantHooks: false }
```

Но состояние начального объекта тоже изменилось:

```js
> bar
VirtualNode {
  tagName: 'input',
  properties:
   { checked: true,
     type: 'radio',
     value: SoftSetHook { value: 'bar' },
     disabled: true },
  children: [ VirtualText { text: 'Bar' } ],
  key: undefined,
  namespace: null,
  count: 1,
  hasWidgets: false,
  hasThunks: false,
  hooks: undefined,
  descendantHooks: false }
```

### Сложный `radio`

Мощь линз проявляется, когда объект имеет более сложную внутреннюю организацию. 

```js
function complexRadio(name, value, description, actualValue) {
  return h('div.some-formatting-container', [
    h('div.some-other-formatting-container', [
      h('span', 'Some text about the radio'),
      radio(name, value, description, actualValue),
    ]),
  ]);
}
```

Выхлоп:

```js
> const bar = complexRadio('foo', 'bar', 'Bar', 'bar')
> bar
VirtualNode {
  tagName: 'div',
  properties: { className: 'some-formatting-container' },
  children:
   [ VirtualNode {
       tagName: 'div',
       properties: [Object],
       children: [Object],
       key: undefined,
       namespace: null,
       count: 4,
       hasWidgets: false,
       hasThunks: false,
       hooks: undefined,
       descendantHooks: false } ],
  key: undefined,
  namespace: null,
  count: 5,
  hasWidgets: false,
  hasThunks: false,
  hooks: undefined,
  descendantHooks: false }
> bar.children[0].children[1]
VirtualNode {
  tagName: 'input',
  properties:
   { checked: true,
     type: 'radio',
     value: SoftSetHook { value: 'bar' } },
  children: [ VirtualText { text: 'Bar' } ],
  key: undefined,
  namespace: null,
  count: 1,
  hasWidgets: false,
  hasThunks: false,
  hooks: undefined,
  descendantHooks: false }
```

Попробуем решить с помощью изменения состояния объекта:

```js
function complexDisableMutation(vnode) {
  vnode.children[0].children[1].properties.disabled = true;
  return vnode;
}
```

Выхлоп:

```js
> complexDisableMutation(bar)
VirtualNode {
  tagName: 'div',
  properties: { className: 'some-formatting-container' },
  children:
   [ VirtualNode {
       tagName: 'div',
       properties: [Object],
       children: [Object],
       key: undefined,
       namespace: null,
       count: 4,
       hasWidgets: false,
       hasThunks: false,
       hooks: undefined,
       descendantHooks: false } ],
  key: undefined,
  namespace: null,
  count: 5,
  hasWidgets: false,
  hasThunks: false,
  hooks: undefined,
  descendantHooks: false }
> bar.children[0].children[1]
VirtualNode {
  tagName: 'input',
  properties:
   { checked: true,
     type: 'radio',
     value: SoftSetHook { value: 'bar' },
     disabled: true },
  children: [ VirtualText { text: 'Bar' } ],
  key: undefined,
  namespace: null,
  count: 1,
  hasWidgets: false,
  hasThunks: false,
  hooks: undefined,
  descendantHooks: false }
```

А теперь реализация на линзах:

```js
import {compose, lensIndex, lensProp, set} from 'ramda';

// `propsDisabled` из предыдущего примера.
const properties = lensProp('properties');
const disabled = lensProp('disabled');
const propsDisabled = compose(properties, disabled);
const disable = set(propsDisabled, true);

// добавим пару строк.
const children = lensProp('children');
const _0 = lensIndex(0);
const _1 = lensIndex(1);
const complexDisabled = compose(children, _0, children, _1, propsDisabled);
const complexDisable = set(complexDisabled, true);
```

Работает так же, только не изменяет состояние объекта:

```js
> const bar = complexRadio('foo', 'bar', 'Bar', 'bar')
> bar
VirtualNode {
  tagName: 'div',
  properties: { className: 'some-formatting-container' },
  children:
   [ VirtualNode {
       tagName: 'div',
       properties: [Object],
       children: [Object],
       key: undefined,
       namespace: null,
       count: 4,
       hasWidgets: false,
       hasThunks: false,
       hooks: undefined,
       descendantHooks: false } ],
  key: undefined,
  namespace: null,
  count: 5,
  hasWidgets: false,
  hasThunks: false,
  hooks: undefined,
  descendantHooks: false }
> complexDisable(bar).children[0].children[1]
{ tagName: 'input',
  properties:
   { checked: true,
     type: 'radio',
     value: SoftSetHook { value: 'bar' },
     disabled: true },
  children: [ VirtualText { text: 'Bar' } ],
  key: undefined,
  namespace: null,
  count: 1,
  hasWidgets: false,
  hasThunks: false,
  hooks: undefined,
  descendantHooks: false,
  version: '1',
  type: 'VirtualNode' }
> bar
VirtualNode {
  tagName: 'div',
  properties: { className: 'some-formatting-container' },
  children:
   [ VirtualNode {
       tagName: 'div',
       properties: [Object],
       children: [Object],
       key: undefined,
       namespace: null,
       count: 4,
       hasWidgets: false,
       hasThunks: false,
       hooks: undefined,
       descendantHooks: false } ],
  key: undefined,
  namespace: null,
  count: 5,
  hasWidgets: false,
  hasThunks: false,
  hooks: undefined,
  descendantHooks: false }
```

### Сравнение решений

В примере с линзами, мы использовали ранее определенные линзы (`propsDisabled`). В варианте с изменяемым объектом поступим так же - будем использовать ранее определенную функцию `disableMutation`:

```js
function complexDisableMutation(vnode) {
  vnode.children[0].children[1] = disableMutation(vnode.children[0].children[1]);
  return vnode;
}
```

Не слишком изящно - приходится писать путь к потомку с обеих сторон оператора присваивания. 

Еще обрати внимание на ньюанс - `complexDisable` использует линзы напрямую, а не функцию `disable`. Можно переписать так, чтобы `complexDisable` использовал `disable`, вместо линз:

```js
import {compose, lensIndex, lensProp, over} from 'ramda';

const properties = lensProp('properties');
const disabled = lensProp('disabled');
const propsDisabled = compose(properties, disabled);
const disable = set(propsDisabled, true);

const children = lensProp('children');
const _0 = lensIndex(0);
const _1 = lensIndex(1);
const complexDisabled = compose(children, _0, children, _1);
const complexDisable = over(complexDisabled, disable);
```

Работает точно так же, так что можно не заморачиваться над внутренностями `disable`.

Если ты не знаком с функцией `over`, она работает как `set`, но позволяет применить функцию к фокусу линзы:

```js
set(lensProp('foo'), 13, {foo: 3}); //=> {foo: 13}
over(lensProp('foo'), add(10), {foo: 3}); //=> {foo: 13}
```

### Заключение

Оба решения удовлетворяют принципу открытости/закрытости, так что цель была достигнута. Но стоило ли использовать линзы?

В случае простых примеров, выгода от использования линз довольно спорная. Но она становится очевидной для многих ситуаций из реального мира. Так что, ответ на вопрос выше - да, стоило!

Для справки, листинг обоих решений:

```js
import {h} from 'virtual-dom';
import {compose, lensIndex, lensProp, over, set} from 'ramda';

function radio(name, value, description, actualValue) {
  return h('input', {
    checked: value === actualValue,
    type: 'radio',
    value
  }, description);
}

function complexRadio(name, value, description, actualValue) {
  return h('div.some-formatting-container', [
    h('div.some-other-formatting-container', [
      h('span', 'Some text about the radio'),
      radio(name, value, description, actualValue),
    ]),
  ]);
}

const _0 = lensIndex(0);
const _1 = lensIndex(1);
const children = lensProp('children');
const disabled = lensProp('disabled');
const properties = lensProp('properties');

const complexDisabled = compose(children, _0, children, _1);
const propsDisabled = compose(properties, disabled);

const disable = set(propsDisabled, true);
const complexDisable = over(complexDisabled, disable);

function disableMutation(vnode) {
  vnode.properties.disabled = true;
  return vnode;
}

function complexDisableMutation(vnode) {
  vnode.children[0].children[1] = disableMutation(vnode.children[0].children[1]);
  return vnode;
}
```

Угадай, какой вариант пошел в продакшен. Теперь про тесты...