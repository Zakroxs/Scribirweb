# ZScriv ✍️ — Sistema Operativo Narrativo

**ZScriv** es un escritorio de escritura para novelistas y escritores de ficción. Reúne en una sola página el manuscrito, el mundo de la historia (personajes, lugares, objetos, criaturas, razas), los mapas de relaciones, la línea de tiempo y tu progreso de escritura.

Funciona **100 % en tu navegador**: no necesita servidor, cuenta ni instalación, y tus textos se guardan en tu propio dispositivo. Está disponible en **español y English**.

> *English summary:* ZScriv is a browser-based writing desk for novelists: manuscript editor, world-building database, relationship map, timeline and progress tracking, with EPUB/Word export and automatic backups. No server, no account — your work stays on your device. Switch language in Settings ⚙️ → General.

---

## Para quién es

- Quien escribe una novela larga y necesita tener ordenados los personajes, los lugares y la cronología.
- Quien escribe desde el celular y desde la computadora y quiere la misma herramienta en ambos.
- Quien prefiere una herramienta ligera y privada, sin suscripciones ni nube.

---

## Qué puedes hacer

### 1. Escribir y organizar el manuscrito
- Estructura en tres niveles: **Partes → Capítulos → Escenas**, con árbol lateral para crear, abrir y eliminar.
- **Editor** limpio con tamaño de letra, ancho, interlineado y tipografía configurables, y **modo composición** que oculta todo salvo el texto.
- **Panel de detalles** por escena: sinopsis, estado (sin empezar, borrador, en revisión, terminado), etiqueta de color, notas, palabras clave, objetivo de palabras e **instantáneas** para guardar versiones.
- **Corcho** (tarjetas con la sinopsis de cada escena), **Esquema** (tabla con estado, etiqueta y palabras) y búsqueda dentro del manuscrito y en todo el proyecto.
- **Papelera**: lo que borras se puede restaurar a su lugar original.

### 2. Menciones: tu historia conectada
Mientras escribes, un símbolo abre sugerencias y enlaza el texto con la ficha del mundo:

| Escribe | Menciona |
| --- | --- |
| `@Nombre` | un personaje |
| `#Nombre` | un lugar |
| `*Nombre` o `*categoría` | un objeto |
| `%Nombre` o `%categoría` | una criatura |
| `&Nombre` | una raza |

Al tocar una mención se abre su ficha sin salir del editor. En el celular, una barra sobre el teclado inserta esos símbolos con un toque.

### 3. Construir el mundo
Fichas completas para:
- **Personajes** (con 10 arquetipos que precargan rasgos, miedos, deseos, defectos y habilidades): identidad, personalidad, motivación (deseo vs. necesidad, herida, defecto trágico, arco), habilidades con derivados, creencias y voz, trasfondo.
- **Lugares**, **objetos** (categoría y subcategoría), **criaturas** (hábitat, peligrosidad de 1 a 5), **razas**, culturas, magia/tecnología y **notas de investigación** con imágenes.

### 4. Mapa de relaciones y línea de tiempo
- **Mapa** con cuatro vistas (todos, genealogía, lugares, objetos y criaturas), zoom y desplazamiento, y vínculos entre fichas con tipos de relación (familia, amor, amistad, conflicto, procedencia…), incluso asimétricos.
- **Línea de tiempo** del mundo con fechas libres («Año 302», «Tercera luna del invierno») y orden manual.

### 5. Seguimiento de apariciones
- Cada ficha muestra **en qué escenas aparece** y cuántas veces se la menciona, con acceso directo a cada escena.
- Avisa si un personaje o criatura **lleva muchas escenas sin aparecer** (el umbral lo eliges).
- En **Progreso** ves una tira por personaje con todas las escenas de la novela.

### 6. Medir tu avance
Palabras por escena, por documento y del proyecto completo, **meta diaria**, **racha** de días escribiendo, tiempo de escritura, escena más larga y mapa de calor de los últimos 30 días.

### 7. Exportar
| Formato | Para qué |
| --- | --- |
| **EPUB** | leer en un e-reader (con índice, portada y autor) |
| **Word (.docx)** | agentes y editoriales (interlineado doble opcional) |
| **TXT / Markdown** | texto plano |
| **HTML interactivo** | compartir con menciones convertidas en tarjetas |
| **PDF** | desde «Imprimir / Guardar como PDF» |
| **JSON** | copia completa del proyecto (manuscrito y mundo) |

### 8. Asistente de IA (opcional)
Doce modos: ideas, análisis de tramas, diálogos, continuar texto, worldbuilding, revisión estructural, escena nueva, estilo, desarrollo de personajes, sinopsis, títulos y coherencia. Funciona con **Anthropic (Claude)**, **Ollama** local o un **servidor local compatible con OpenAI**. La clave se guarda solo en tu navegador.

---

## Capacidad y límites

- **Proyectos:** tantos como quieras, cada uno independiente.
- **Almacenamiento:** los proyectos se guardan en la base de datos del navegador (IndexedDB), sin el límite de 5 MB de antes. El tope real lo fija el espacio que tu navegador y tu dispositivo permitan; en el uso normal una novela de texto ocupa muy poco, y las imágenes son lo que más pesa.
- **Autoguardado:** cada 30 segundos por defecto (configurable de 15 s a 2 min) y al salir de la pestaña.
- **Copias automáticas:** cada ~10 minutos si hubo cambios; se conservan las últimas 6 y una por día durante una semana. Se restauran como proyecto nuevo, sin tocar el actual.
- **Sin conexión:** con la página ya cargada puedes seguir escribiendo sin internet; para abrirla sin conexión desde cero, usa la variante de un solo archivo guardada en tu dispositivo. Solo el asistente de IA en la nube necesita conexión.
- **Privacidad:** nada se envía a ningún servidor. Solo si usas el asistente de IA, el texto que le pidas analizar viaja al proveedor que elijas.

---

## Cómo usarlo

### Primeros pasos
1. Abre la página. La primera vez te pide crear un proyecto: ponle nombre y se crea con una parte, un capítulo y una escena.
2. Usa el botón **＋** del panel lateral para añadir partes, capítulos y escenas. Toca una escena para escribir.
3. Crea tus primeros personajes y lugares desde las pestañas laterales 🧑 y 📍, o desde la vista **Mundo**.
4. Escribe `@` en el texto para mencionar a un personaje.

### En el celular
- Abajo tienes la **barra de navegación** (Editor, Corcho, Mundo, Mapa y «Más»). El resto de vistas y herramientas están en **Más**.
- El botón **☰** abre el panel del manuscrito y el mundo; **ℹ️** abre el panel de detalles; **⚙️** abre los ajustes.
- Al escribir aparece una barra sobre el teclado con `@ # * % &`, deshacer y rehacer, ajustes de letra y ocultar teclado.
- El botón «atrás» de Android cierra paneles y ventanas en vez de salir de la página.
- Con Chrome puedes añadirlo a la pantalla de inicio desde el menú ⋮.

### En la computadora
- Atajos: **Ctrl+K** busca en todo el proyecto, **Ctrl+S** guarda.
- Los paneles lateral y de detalles se pueden ocultar para ganar espacio.

### Personalizarlo (⚙️ Ajustes)
- **Modo sencillo** (manuscrito, corcho y notas) o **modo completo** (todas las herramientas); después puedes encender o apagar cada vista, panel y herramienta. Ocultar algo **no borra datos**.
- Idioma, tamaño de la interfaz, color de acento, letra, botones grandes y reducir animaciones.
- Corrector ortográfico, texto justificado, cursor centrado, menciones y barra sobre el teclado.
- Qué datos muestra la barra de estado, intervalo de autoguardado y aviso de ausencias de personajes.
- En **Datos** puedes exportar e importar tus ajustes, ver las copias automáticas o restablecerlo todo.

### Proteger tu trabajo
- Las copias automáticas están en **Proyectos → Copias automáticas**.
- Exporta un **JSON** de vez en cuando como respaldo adicional: es tu copia completa y sirve para pasar tus proyectos a otro dispositivo (Exportar → Proyecto completo (.json), y en el otro dispositivo Importar JSON).
- En Chrome o Edge de escritorio puedes elegir una carpeta donde se guarde una copia `.zscriv.json` cada ~30 segundos.

---

## Archivos del proyecto

| Archivo | Contenido |
| --- | --- |
| `index.html` | Estructura de la página |
| `ZScriv.css` | Estilos |
| `ZScriv.js` | Lógica, almacenamiento, exportaciones e idiomas |

Los tres deben estar en la misma carpeta con esos nombres exactos. Para publicarlo en **GitHub Pages**, sube los tres archivos (y este README) a la raíz de un repositorio y activa *Settings → Pages → Deploy from a branch → main / root*. Importante: el navegador guarda los proyectos por dirección web, así que al cambiar de dirección debes exportarlos a JSON e importarlos en la nueva.

Si necesitas abrirlo en un celular desde el gestor de archivos, usa la variante de **un solo archivo** (`ZScriv_un_solo_archivo.html`), que lleva todo dentro.

---

## Para desarrolladores

JavaScript sin dependencias ni paso de compilación. Para probarlo en local sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8000
```

y abre `http://localhost:8000`. Los textos de la interfaz están escritos en español en `ZScriv.js`; el diccionario del inglés (`I18N_EN`) y la guía en inglés (`GUIA_EN`) están en la sección «IDIOMAS».
