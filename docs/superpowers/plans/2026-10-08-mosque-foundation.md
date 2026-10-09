# Mosque Foundation Implementation Plan

> **For agentic workers:** Execute the approved tasks in this session and review the 3D integration separately.

**Goal:** Создать адаптивный новый проект с мечетью вместо чашки.
**Architecture:** Статическая страница, отдельные тексты и стили. Three.js сцена монтируется независимо и имеет fallback. Локальный сервер обслуживает только файлы публичного проекта.
**Tech Stack:** HTML, CSS, browser ES modules, Three.js 0.186.1, Node.js.
**Spec:** docs/superpowers/specs/2026-10-08-mosque-design.md

## Global Constraints
- Использовать предоставленный mosque-360.glb, не примитив и не чашку.
- Не изменять исходные GLB/GIF.
- Не придумывать факты о мечети и контакты.
- Поддержать mobile, keyboard, reduced-motion и fallback.

## Files and tasks
- [x] index.html + src/styles.css: редакционный первый экран, семантика, адаптивность и controls.
- [x] src/content.js + src/main.js: отдельные русские тексты, меню, состояние просмотра, GIF fallback и пауза.
- [x] src/scene.js: GLTFLoader, камера по bounds, light, controls и cleanup. Проверить реальный файл, импорт и resize.
- [x] server.mjs + package.json + start.ps1: локальный запуск без npm install, ограничение путей и MIME. Проверить HTTP GET и отказ на приватных/внешних путях.
- [x] README.md: запуск и инструкция будущего подключения.
- [x] Визуальная проверка в доступном браузере; если браузер недоступен, указать ограничение без заявления об успешном просмотре.


Визуальная проверка не выполнена: браузеры Chrome и IAB недоступны в рабочей сессии. Сервер запущен на http://127.0.0.1:4173. Three.js сохранён локально в vendor/three; исходные ассеты сохранены. Проверки: node --test (1 pass), node scripts/check-project.mjs (pass), все 13 публичных HTTP путей (200).
