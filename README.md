# Marginalia Web

Aplicación React para organizar libros y tomar anotaciones dentro de capítulos y subcapítulos. El editor funciona como una hoja continua: permite escribir e insertar bloques en cualquier posición sin abandonar el capítulo.

## Funcionalidades

- Registro, verificación de cuenta, login tradicional y Google OAuth2.
- CRUD de libros y árbol recursivo de capítulos.
- Hoja de notas continua con inserción entre bloques.
- Texto libre, títulos, subtítulos y listas con viñetas, números o letras.
- Bloques de código, fórmulas LaTeX, ejercicios, preguntas con respuestas e imágenes.
- Descripciones opcionales para código, fórmulas, ejercicios e imágenes.
- Galerías de múltiples imágenes centradas, carga con progreso y vista ampliada.
- Modo de repaso que oculta las respuestas hasta revelarlas.
- Borradores automáticos almacenados localmente por capítulo, posición y tipo de bloque.
- Guardado mediante botón, `Ctrl/Cmd + S` o `Ctrl/Cmd + Enter`; `Escape` cierra un editor secundario.
- Exportación de libros a PDF y consulta de exportaciones asíncronas.

Los borradores locales no crean contenido incompleto en la API. Se eliminan únicamente cuando el servidor confirma la creación o actualización del bloque.

## Stack

- React 18 y TypeScript.
- Vite 8 y Tailwind CSS 4.
- TanStack Query y Axios.
- React Hook Form, Zod y Sonner.
- KaTeX y React Syntax Highlighter.
- Vitest, Testing Library y MSW.
- Oxlint y ESLint.

## Configuración

Crear `.env` en la raíz del frontend:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Instalar dependencias y levantar el entorno local:

```powershell
npm install
npm run dev
```

## Calidad

```powershell
npm run lint
npm run lint:eslint
npm test
npm run build
```

Las pruebas del editor usan MSW para validar creación, edición y eliminación de bloques, recuperación de borradores, atajos, modo de repaso y vista ampliada de imágenes.
