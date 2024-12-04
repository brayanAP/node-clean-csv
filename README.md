# CSV Cleaner and Name Formatter with OpenAI

Este proyecto permite limpiar, validar y procesar datos de un archivo CSV utilizando utilidades personalizadas y la API de OpenAI. Su propósito principal es transformar y estructurar datos personales, como nombres y contactos, para estandarizarlos y adaptarlos a un formato específico.

## Propósito

1. **Limpieza de datos**: Elimina registros inválidos o marcados como prueba.
2. **Formato estandarizado**: Usa reglas definidas para reconstruir nombres y apellidos en español, adaptándolos a un formato típico mexicano.
3. **Integración con OpenAI**: Utiliza modelos de OpenAI para analizar y corregir nombres incompletos o incoherentes.
4. **Exportación de resultados**: Genera dos archivos CSV:
   - `clean.csv`: Contiene registros procesados y validados.
   - `errors.csv`: Contiene registros rechazados o con errores.

## Flujo de Trabajo

1. **Lectura del archivo CSV de entrada**:
   - Se procesa un archivo llamado `input.csv`, ubicado en la raíz del proyecto.
2. **Transformaciones iniciales**:
   - Normaliza datos de contacto como teléfonos, correos electrónicos y nombres mediante utilidades personalizadas.
3. **Validación**:
   - Filtra registros inválidos o de prueba.
4. **Procesamiento con OpenAI**:
   - Utiliza la API de OpenAI para analizar los nombres, reconstruyéndolos según reglas predefinidas.
5. **Generación de archivos de salida**:
   - Los datos procesados se guardan en `output/clean.csv`.
   - Los errores se almacenan en `output/errors.csv`.

## Requisitos

- **Node.js**: Para ejecutar el script.
- **API Key de OpenAI**: Debes configurar tu clave en el archivo `.env` bajo la variable `OPEN_AI_KEY`.
- **Archivo de entrada**: Un archivo CSV llamado `input.csv` con los siguientes campos mínimos:
  - `Contacto`: Nombres y apellidos.
  - `Móvil` y `Teléfono alternativo`: Teléfonos de contacto.
  - `Correo`: Dirección de correo electrónico.