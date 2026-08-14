import { TopicDefinition } from '@/types';

export const topics: TopicDefinition[] = [
  // Domain 1
  { id: 'tipos-de-ml', name: 'Tipos de Aprendizaje Automatico', domainId: 1 },
  { id: 'clasificacion-regresion', name: 'Clasificacion vs Regresion', domainId: 1 },
  { id: 'pipeline-ml', name: 'Pipeline de ML', domainId: 1 },
  { id: 'metricas-evaluacion', name: 'Metricas de Evaluacion', domainId: 1 },
  { id: 'servicios-aws-ml', name: 'Servicios AWS para ML', domainId: 1 },
  { id: 'redes-neuronales-dl', name: 'Redes Neuronales y Deep Learning', domainId: 1 },
  { id: 'overfitting-underfitting', name: 'Overfitting y Underfitting', domainId: 1 },
  // Domain 2
  { id: 'modelos-fundacionales-llms', name: 'Modelos Fundacionales y LLMs', domainId: 2 },
  { id: 'transformers', name: 'Arquitectura Transformer', domainId: 2 },
  { id: 'prompt-engineering', name: 'Ingenieria de Prompts', domainId: 2 },
  { id: 'fine-tuning-rag', name: 'Fine-tuning vs RAG', domainId: 2 },
  { id: 'embeddings-vectores', name: 'Embeddings y Vectores', domainId: 2 },
  { id: 'parametros-inferencia', name: 'Parametros de Inferencia', domainId: 2 },
  // Domain 3
  { id: 'amazon-bedrock', name: 'Amazon Bedrock', domainId: 3 },
  { id: 'amazon-q', name: 'Amazon Q', domainId: 3 },
  { id: 'sagemaker', name: 'Amazon SageMaker', domainId: 3 },
  { id: 'seleccion-modelos', name: 'Seleccion de Modelos', domainId: 3 },
  { id: 'optimizacion-costos', name: 'Optimizacion de Costos', domainId: 3 },
  { id: 'proveedores-modelos', name: 'Proveedores de Modelos', domainId: 3 },
  // Domain 4
  { id: 'sesgo-equidad', name: 'Sesgo y Equidad', domainId: 4 },
  { id: 'transparencia-explicabilidad', name: 'Transparencia y Explicabilidad', domainId: 4 },
  { id: 'ia-responsable-guardrails', name: 'IA Responsable y Guardrails', domainId: 4 },
  { id: 'human-in-the-loop', name: 'Human-in-the-Loop', domainId: 4 },
  // Domain 5
  { id: 'cifrado-seguridad', name: 'Cifrado y Seguridad', domainId: 5 },
  { id: 'iam-control-acceso', name: 'IAM y Control de Acceso', domainId: 5 },
  { id: 'privacidad-cumplimiento', name: 'Privacidad y Cumplimiento', domainId: 5 },
  { id: 'gobernanza-auditoria', name: 'Gobernanza y Auditoria', domainId: 5 },
];
