# Тестовое задание

## How to check

1) Run
```
npm i && npm run dev
```
2) Visit [http://localhost:1234/](http://localhost:1234/)

## Задача

Написать логику для [WYSIWYG](https://ru.wikipedia.org/wiki/WYSIWYG), который имеет из функциональности:

- Хедеры
- Italic
- Bold

Дополнительные требования:

- При вырезании (CTRL+X) исходного контента и последующей вставке (CTRL+V), текст и его стилизация остаются неизменными
- Отсутствие возможности XSS-атак
- При копировании исходного текста в редактор [Microsoft Office Wold Online](https://office.live.com/), стилизация (italic, хедеры и bold) остаются неизменными

Браузеры: Chrome, Safari and Firefox

## Технологии

Использовать можно любой язык, транслирующийся в `JavaScript` (`TypeScript`, `CoffeeScript`, `ClojureScript` и тд.) или обычный `JavaScript`, с условием использования только стандартного `DOM API` без дополнительных обвязок фреймворков. То есть,  если, к примеру, язык `Elm` не умеет в работу с нативным `DOM API`  выполненное задание на `Elm` не принимается. 

Также, запрещается устанавливать какие либо зависимости (кроме `devDependencies` для вашего языка). Все функции, которые решают задачи, должны состоять из композиции стандартного для выбранного языка API.

## Исходные материалы

Потенциальному студенту курса даются: `index.html` с версткой [WYSIWYG](https://ru.wikipedia.org/wiki/WYSIWYG), `styles/*.css` со стилями для [WYSIWYG](https://ru.wikipedia.org/wiki/WYSIWYG).

## Как сдавать задание

1. Размещаете репозиторий на GitHub / GitLab (не делайте форк этого репозитория, если опасаетесь, что конкуренты "подсмотрят")
2. Добавляете в коллабораторы репозитория @xanf и @jsmonk
3. Создаете issue в своем репозитории "просьба проверить тестовое задание" и назначаете его @xanf
4. Все ревью будет выполнено в issue
