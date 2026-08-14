export interface Comparison {
  id: string;
  title: string;
  items: string[];
  criteria: { label: string; values: string[] }[];
  whenToUse: { item: string; use: string }[];
}

export const comparisons: Comparison[] = [
  {
    id: 'bedrock-vs-sagemaker',
    title: 'Amazon Bedrock vs SageMaker',
    items: ['Amazon Bedrock', 'Amazon SageMaker'],
    criteria: [
      {
        label: 'Proposito principal',
        values: [
          'Acceso a modelos fundacionales via API',
          'Plataforma completa para construir, entrenar y desplegar modelos ML',
        ],
      },
      {
        label: 'Infraestructura',
        values: [
          'Serverless, sin gestion de instancias',
          'Requiere configurar instancias (notebooks, training, endpoints)',
        ],
      },
      {
        label: 'Modelos disponibles',
        values: [
          'Modelos fundacionales de terceros (Claude, Llama, Titan, etc.)',
          'Algoritmos propios + modelos de JumpStart + modelos custom',
        ],
      },
      {
        label: 'Personalizacion',
        values: [
          'Fine-tuning limitado, RAG con Knowledge Bases, Guardrails',
          'Control total: arquitectura, datos, hiperparametros, frameworks',
        ],
      },
      {
        label: 'Complejidad',
        values: [
          'Baja - ideal para comenzar rapido con IA generativa',
          'Alta - requiere conocimiento de ML y gestion de infra',
        ],
      },
      {
        label: 'Costo',
        values: [
          'Pago por token (entrada/salida) o throughput provisionado',
          'Pago por instancia-hora (training + endpoints)',
        ],
      },
    ],
    whenToUse: [
      {
        item: 'Amazon Bedrock',
        use: 'Cuando necesitas IA generativa rapida sin gestionar infraestructura. Chatbots, generacion de contenido, busqueda con RAG, resumen de documentos.',
      },
      {
        item: 'Amazon SageMaker',
        use: 'Cuando necesitas control total sobre el modelo: entrenamiento con datos propios, algoritmos personalizados, MLOps completo, o modelos no generativos (clasificacion, regresion).',
      },
    ],
  },
  {
    id: 'kendra-vs-bedrock-kb',
    title: 'Amazon Kendra vs Bedrock Knowledge Bases',
    items: ['Amazon Kendra', 'Bedrock Knowledge Bases'],
    criteria: [
      {
        label: 'Tipo de busqueda',
        values: [
          'Busqueda empresarial semantica con ranking ML',
          'RAG: busqueda + generacion de respuestas con LLM',
        ],
      },
      {
        label: 'Salida',
        values: [
          'Lista de documentos/pasajes relevantes rankeados',
          'Respuesta generada por un LLM basada en documentos encontrados',
        ],
      },
      {
        label: 'Conectores',
        values: [
          '40+ conectores nativos (S3, SharePoint, Confluence, etc.)',
          'S3, Web Crawler, Confluence, SharePoint, Salesforce',
        ],
      },
      {
        label: 'Modelo de IA',
        values: [
          'ML de busqueda propio (no requiere LLM)',
          'Requiere un modelo fundacional de Bedrock para generar respuestas',
        ],
      },
      {
        label: 'Precio',
        values: [
          'Precio fijo por indice + consultas',
          'Costo de embeddings + almacenamiento vectorial + tokens del LLM',
        ],
      },
    ],
    whenToUse: [
      {
        item: 'Amazon Kendra',
        use: 'Cuando necesitas un motor de busqueda empresarial que devuelva documentos relevantes. Portal de busqueda interna, FAQs, busqueda en intranets.',
      },
      {
        item: 'Bedrock Knowledge Bases',
        use: 'Cuando necesitas respuestas generadas en lenguaje natural basadas en tus documentos. Chatbots de atencion al cliente, asistentes de soporte tecnico.',
      },
    ],
  },
  {
    id: 'q-business-vs-q-developer',
    title: 'Amazon Q Business vs Q Developer',
    items: ['Amazon Q Business', 'Amazon Q Developer'],
    criteria: [
      {
        label: 'Audiencia',
        values: [
          'Empleados y usuarios de negocio',
          'Desarrolladores de software',
        ],
      },
      {
        label: 'Funcion principal',
        values: [
          'Asistente empresarial conectado a datos internos (RAG)',
          'Asistente de codificacion con autocompletado y depuracion',
        ],
      },
      {
        label: 'Integraciones',
        values: [
          '40+ fuentes de datos: S3, SharePoint, Confluence, Salesforce, etc.',
          'IDEs (VS Code, JetBrains), AWS Console, CLI',
        ],
      },
      {
        label: 'Funcionalidades clave',
        values: [
          'Preguntas sobre documentos, resumen, generacion de contenido basado en datos',
          'Autocompletado de codigo, escaneo de seguridad, transformacion de codigo',
        ],
      },
      {
        label: 'Seguridad',
        values: [
          'Respeta ACLs y permisos existentes del usuario',
          'Referencia de licencias open-source, escaneo OWASP',
        ],
      },
    ],
    whenToUse: [
      {
        item: 'Amazon Q Business',
        use: 'Para conectar datos empresariales y permitir a empleados buscar informacion, generar resumenes y automatizar tareas basadas en documentos internos.',
      },
      {
        item: 'Amazon Q Developer',
        use: 'Para acelerar el desarrollo de software con sugerencias de codigo en tiempo real, deteccion de vulnerabilidades y asistencia en la consola AWS.',
      },
    ],
  },
  {
    id: 'fine-tuning-vs-rag',
    title: 'Fine-tuning vs RAG',
    items: ['Fine-tuning', 'RAG'],
    criteria: [
      {
        label: 'Que modifica',
        values: [
          'Los pesos del modelo (reentrenamiento parcial)',
          'Nada del modelo; solo agrega contexto externo al prompt',
        ],
      },
      {
        label: 'Datos necesarios',
        values: [
          'Dataset de entrenamiento etiquetado (pares input/output)',
          'Base de conocimiento (documentos, PDFs, paginas web)',
        ],
      },
      {
        label: 'Costo',
        values: [
          'Alto (entrenamiento GPU + almacenamiento del modelo)',
          'Medio (embeddings + base de datos vectorial + consultas)',
        ],
      },
      {
        label: 'Actualizacion de conocimiento',
        values: [
          'Requiere reentrenar para incorporar datos nuevos',
          'Se actualiza al cambiar los documentos en la base de conocimiento',
        ],
      },
      {
        label: 'Mejor para',
        values: [
          'Cambiar estilo, tono o comportamiento del modelo; tareas muy especificas',
          'Agregar conocimiento actualizado; respuestas basadas en datos propios',
        ],
      },
      {
        label: 'Alucinaciones',
        values: [
          'Puede reducir si se entrena bien, pero no garantiza eliminacion',
          'Reduce significativamente al anclar respuestas a documentos reales',
        ],
      },
    ],
    whenToUse: [
      {
        item: 'Fine-tuning',
        use: 'Cuando necesitas que el modelo adopte un estilo especifico, genere outputs en un formato particular, o domine un dominio tecnico concreto. Tambien para tareas donde el rendimiento del modelo base es insuficiente.',
      },
      {
        item: 'RAG',
        use: 'Cuando necesitas respuestas basadas en informacion actualizada, datos internos de la empresa, o conocimiento especifico sin modificar el modelo. Primera opcion en la mayoria de los casos.',
      },
    ],
  },
  {
    id: 'canvas-vs-jumpstart',
    title: 'SageMaker Canvas vs SageMaker JumpStart',
    items: ['SageMaker Canvas', 'SageMaker JumpStart'],
    criteria: [
      {
        label: 'Audiencia',
        values: [
          'Analistas de negocio, usuarios no tecnicos',
          'Cientificos de datos, desarrolladores ML',
        ],
      },
      {
        label: 'Experiencia requerida',
        values: [
          'No requiere codigo ni experiencia en ML',
          'Requiere conocimiento basico de ML y Python',
        ],
      },
      {
        label: 'Interfaz',
        values: [
          'Visual, arrastrar y soltar datos y configurar modelos',
          'Notebooks con modelos pre-entrenados y codigo de ejemplo',
        ],
      },
      {
        label: 'Tipo de modelos',
        values: [
          'AutoML: clasif., regresion, series temporales, NLP, vision',
          'Cientos de modelos fundacionales y modelos pre-entrenados (Llama, Falcon, etc.)',
        ],
      },
      {
        label: 'Personalizacion',
        values: [
          'Limitada: seleccion automatica de algoritmos',
          'Alta: fine-tuning, modificacion de hiperparametros, codigo custom',
        ],
      },
    ],
    whenToUse: [
      {
        item: 'SageMaker Canvas',
        use: 'Cuando un analista de negocio necesita crear modelos predictivos sin escribir codigo. Ideal para prediccion de demanda, clasificacion de clientes, analisis de churn.',
      },
      {
        item: 'SageMaker JumpStart',
        use: 'Cuando un cientifico de datos necesita un punto de partida rapido con modelos pre-entrenados que puede personalizar con codigo. Ideal para fine-tuning de LLMs y despliegue de modelos en endpoints.',
      },
    ],
  },
  {
    id: 'comprehend-vs-textract',
    title: 'Amazon Comprehend vs Amazon Textract',
    items: ['Amazon Comprehend', 'Amazon Textract'],
    criteria: [
      {
        label: 'Tipo de entrada',
        values: [
          'Texto ya digitalizado (strings, documentos de texto)',
          'Imagenes y PDFs (documentos escaneados o fotografiados)',
        ],
      },
      {
        label: 'Funcion principal',
        values: [
          'Analisis de NLP: sentimiento, entidades, temas, idioma',
          'OCR avanzado: extraccion de texto, formularios y tablas',
        ],
      },
      {
        label: 'Salida',
        values: [
          'Entidades detectadas, sentimiento (positivo/negativo/neutro), temas',
          'Texto extraido, pares clave-valor de formularios, datos de tablas',
        ],
      },
      {
        label: 'Especialidad medica',
        values: [
          'Comprehend Medical: entidades medicas (medicamentos, condiciones, PHI)',
          'No tiene version medica especializada',
        ],
      },
      {
        label: 'Caso de uso tipico',
        values: [
          'Analizar sentimiento de resenas, extraer entidades de tickets de soporte',
          'Digitalizar facturas, extraer datos de contratos, procesar formularios',
        ],
      },
    ],
    whenToUse: [
      {
        item: 'Amazon Comprehend',
        use: 'Cuando tienes texto digital y necesitas entender su contenido: analisis de sentimiento en resenas, deteccion de PII, clasificacion de documentos por tema, extraccion de entidades nombradas.',
      },
      {
        item: 'Amazon Textract',
        use: 'Cuando tienes documentos fisicos o escaneados y necesitas extraer texto estructurado. Procesamiento de facturas, formularios de impuestos, contratos, recibos.',
      },
    ],
  },
  {
    id: 'inference-types',
    title: 'Real-time vs Asincrona vs Batch Inference',
    items: ['Real-time', 'Asincrona', 'Batch'],
    criteria: [
      {
        label: 'Latencia',
        values: [
          'Milisegundos a segundos',
          'Minutos (se encola)',
          'Horas (programada)',
        ],
      },
      {
        label: 'Disponibilidad del endpoint',
        values: [
          'Siempre activo (24/7)',
          'Siempre activo pero procesa en cola',
          'No requiere endpoint permanente',
        ],
      },
      {
        label: 'Tamano de payload',
        values: [
          'Pequeno (hasta 6 MB)',
          'Grande (hasta 1 GB)',
          'Masivo (datasets completos)',
        ],
      },
      {
        label: 'Costo relativo',
        values: ['Alto (instancia siempre encendida)', 'Medio', 'Bajo (solo paga por procesamiento)'],
      },
      {
        label: 'Caso de uso',
        values: [
          'Chatbots, APIs de prediccion, apps interactivas',
          'Procesamiento de videos, documentos grandes, transcripciones',
          'Scoring de millones de registros, reportes nocturnos',
        ],
      },
      {
        label: 'AWS Service',
        values: [
          'SageMaker Real-time Endpoints, Bedrock InvokeModel',
          'SageMaker Async Inference',
          'SageMaker Batch Transform, Bedrock Batch Inference',
        ],
      },
    ],
    whenToUse: [
      {
        item: 'Real-time',
        use: 'Cuando necesitas respuestas inmediatas para usuarios interactivos. Chatbots, APIs de recomendacion, moderacion de contenido en tiempo real.',
      },
      {
        item: 'Asincrona',
        use: 'Cuando el payload es grande o el procesamiento toma tiempo, y el usuario puede esperar. Procesamiento de documentos largos, transcripcion de audio/video.',
      },
      {
        item: 'Batch',
        use: 'Cuando tienes grandes volumenes de datos para procesar sin urgencia. Scoring nocturno, predicciones masivas, generacion de reportes.',
      },
    ],
  },
  {
    id: 'rekognition-vs-lookout',
    title: 'Amazon Rekognition vs Lookout for Vision',
    items: ['Amazon Rekognition', 'Amazon Lookout for Vision'],
    criteria: [
      {
        label: 'Proposito',
        values: [
          'Analisis general de imagenes y video',
          'Deteccion de anomalias/defectos en imagenes',
        ],
      },
      {
        label: 'Modelos',
        values: [
          'Modelos pre-entrenados + Custom Labels para clasificacion especifica',
          'Modelos entrenados con pocas imagenes (~30 normales)',
        ],
      },
      {
        label: 'Funcionalidades',
        values: [
          'Deteccion de objetos, rostros, texto, moderacion de contenido, celebridades',
          'Clasificacion: normal vs anomalo; localizacion del defecto',
        ],
      },
      {
        label: 'Industria tipica',
        values: [
          'Seguridad, medios, redes sociales, verificacion de identidad',
          'Manufactura, control de calidad, inspeccion industrial',
        ],
      },
      {
        label: 'Personalizacion',
        values: [
          'Custom Labels para deteccion de objetos especificos',
          'Entrenamiento con imagenes propias de productos (pocas imagenes necesarias)',
        ],
      },
    ],
    whenToUse: [
      {
        item: 'Amazon Rekognition',
        use: 'Para analisis general de imagenes: deteccion de rostros, moderacion de contenido, lectura de texto en imagenes, busqueda por similitud facial. Casos de seguridad y medios.',
      },
      {
        item: 'Amazon Lookout for Vision',
        use: 'Para deteccion de defectos en manufactura. Cuando necesitas identificar productos defectuosos en una linea de produccion con pocas imagenes de referencia.',
      },
    ],
  },
  {
    id: 'learning-types',
    title: 'Supervisado vs No Supervisado vs Refuerzo',
    items: ['Supervisado', 'No Supervisado', 'Por Refuerzo'],
    criteria: [
      {
        label: 'Datos de entrada',
        values: [
          'Datos etiquetados (input + output esperado)',
          'Datos sin etiquetas',
          'Entorno + acciones + recompensas',
        ],
      },
      {
        label: 'Objetivo',
        values: [
          'Predecir una salida especifica',
          'Descubrir patrones o estructuras ocultas',
          'Maximizar una recompensa acumulada',
        ],
      },
      {
        label: 'Tareas tipicas',
        values: [
          'Clasificacion, regresion, deteccion de objetos',
          'Clustering, reduccion de dimensionalidad, deteccion de anomalias',
          'Control de robots, juegos, optimizacion de estrategias',
        ],
      },
      {
        label: 'Algoritmos comunes',
        values: [
          'Linear/Logistic Regression, Random Forest, XGBoost, SVM, redes neuronales',
          'K-Means, DBSCAN, PCA, Autoencoders, t-SNE',
          'Q-Learning, Policy Gradient, PPO, A3C',
        ],
      },
      {
        label: 'Ejemplo AWS',
        values: [
          'SageMaker XGBoost para predecir churn de clientes',
          'SageMaker K-Means para segmentacion de clientes',
          'SageMaker RL para optimizacion; RLHF para alinear LLMs',
        ],
      },
    ],
    whenToUse: [
      {
        item: 'Supervisado',
        use: 'Cuando tienes datos etiquetados y quieres predecir un resultado especifico. La mayoria de los problemas de negocio: prediccion de ventas, deteccion de fraude, clasificacion de emails.',
      },
      {
        item: 'No Supervisado',
        use: 'Cuando no tienes etiquetas y quieres descubrir patrones. Segmentacion de clientes, deteccion de anomalias en transacciones, reduccion de dimensionalidad para visualizacion.',
      },
      {
        item: 'Por Refuerzo',
        use: 'Cuando tienes un agente que debe aprender a tomar decisiones secuenciales. Robotica, juegos, optimizacion de rutas, y RLHF para alinear LLMs con preferencias humanas.',
      },
    ],
  },
  {
    id: 'claude-vs-titan-vs-llama',
    title: 'Claude vs Titan vs Llama (en Bedrock)',
    items: ['Claude (Anthropic)', 'Titan (Amazon)', 'Llama (Meta)'],
    criteria: [
      {
        label: 'Proveedor',
        values: ['Anthropic', 'Amazon', 'Meta (open-source)'],
      },
      {
        label: 'Fortalezas',
        values: [
          'Razonamiento complejo, analisis largo, seguimiento de instrucciones, seguridad',
          'Integrado nativamente con AWS, embeddings, generacion de imagenes',
          'Open-source, personalizable, buena relacion rendimiento/costo',
        ],
      },
      {
        label: 'Ventana de contexto',
        values: [
          'Hasta 200K tokens (Claude 3)',
          'Hasta 8K tokens (Titan Text)',
          'Hasta 128K tokens (Llama 3)',
        ],
      },
      {
        label: 'Personalizacion en Bedrock',
        values: [
          'Fine-tuning disponible para ciertos modelos',
          'Fine-tuning y continued pre-training',
          'Fine-tuning disponible',
        ],
      },
      {
        label: 'Modelos especializados',
        values: [
          'Claude 3 Haiku (rapido/barato), Sonnet (equilibrado), Opus (potente)',
          'Titan Text (NLP), Titan Embeddings, Titan Image Generator',
          'Llama 3.x en varios tamanos (8B, 70B, 405B parametros)',
        ],
      },
      {
        label: 'Precio relativo',
        values: [
          'Medio-alto (varia por modelo)',
          'Bajo-medio',
          'Bajo (modelos open-source)',
        ],
      },
    ],
    whenToUse: [
      {
        item: 'Claude (Anthropic)',
        use: 'Para tareas que requieren razonamiento complejo, analisis de documentos largos, seguimiento preciso de instrucciones y seguridad robusta. Ideal para aplicaciones empresariales criticas.',
      },
      {
        item: 'Titan (Amazon)',
        use: 'Para embeddings (Titan Embeddings es excelente para RAG), generacion de imagenes (Titan Image Generator), y cuando se busca la integracion mas nativa con el ecosistema AWS.',
      },
      {
        item: 'Llama (Meta)',
        use: 'Cuando necesitas un modelo potente a menor costo, o cuando planeas personalizar extensivamente el modelo. Buena opcion para equipos que quieren experimentar con fine-tuning.',
      },
    ],
  },
];
