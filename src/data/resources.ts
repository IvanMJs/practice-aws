import { TopicResource } from '@/types';

export const domainResources: Record<number, TopicResource[]> = {
  1: [
    {
      name: 'Tipos de Aprendizaje Automatico',
      description: 'Supervisado, no supervisado y por refuerzo',
      urls: [
        { label: 'AWS ML Concepts', url: 'https://docs.aws.amazon.com/machine-learning/latest/dg/types-of-ml.html' },
        { label: 'Amazon SageMaker ML Concepts', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/whatis.html' },
      ],
    },
    {
      name: 'Pipeline de ML',
      description: 'Recoleccion de datos, feature engineering, entrenamiento, evaluacion y despliegue',
      urls: [
        { label: 'SageMaker ML Pipeline', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/build-and-manage-steps.html' },
        { label: 'AWS ML Lifecycle', url: 'https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/well-architected-machine-learning-lifecycle.html' },
      ],
    },
    {
      name: 'Metricas de Evaluacion',
      description: 'Accuracy, Precision, Recall, F1, AUC-ROC, RMSE',
      urls: [
        { label: 'Model Evaluation Metrics', url: 'https://docs.aws.amazon.com/machine-learning/latest/dg/evaluating_models.html' },
      ],
    },
    {
      name: 'Servicios de AWS para ML',
      description: 'Rekognition, Comprehend, Translate, Polly, Lex, Textract, Forecast, Personalize, Kendra',
      urls: [
        { label: 'AWS AI/ML Services', url: 'https://aws.amazon.com/machine-learning/' },
        { label: 'Amazon Rekognition', url: 'https://docs.aws.amazon.com/rekognition/latest/dg/what-is.html' },
        { label: 'Amazon Comprehend', url: 'https://docs.aws.amazon.com/comprehend/latest/dg/what-is.html' },
        { label: 'Amazon Textract', url: 'https://docs.aws.amazon.com/textract/latest/dg/what-is.html' },
      ],
    },
    {
      name: 'Redes Neuronales y Deep Learning',
      description: 'Conceptos de redes neuronales, overfitting, underfitting, bias-variance tradeoff',
      urls: [
        { label: 'Deep Learning on AWS', url: 'https://aws.amazon.com/deep-learning/' },
        { label: 'SageMaker Built-in Algorithms', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/algos.html' },
      ],
    },
  ],
  2: [
    {
      name: 'Modelos Fundacionales y LLMs',
      description: 'Conceptos de foundation models, large language models, pre-entrenamiento',
      urls: [
        { label: 'AWS Foundation Models', url: 'https://aws.amazon.com/what-is/foundation-models/' },
        { label: 'Amazon Bedrock Foundation Models', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html' },
      ],
    },
    {
      name: 'Arquitectura Transformer',
      description: 'Mecanismo de atencion, tokenizacion, embeddings',
      urls: [
        { label: 'AWS Generative AI Fundamentals', url: 'https://aws.amazon.com/what-is/generative-ai/' },
      ],
    },
    {
      name: 'Ingenieria de Prompts',
      description: 'Tecnicas de prompting: zero-shot, few-shot, chain-of-thought',
      urls: [
        { label: 'Prompt Engineering for Bedrock', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-engineering-guidelines.html' },
        { label: 'Amazon Bedrock Prompts', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/prompts.html' },
      ],
    },
    {
      name: 'Fine-tuning vs RAG',
      description: 'Cuando usar fine-tuning, cuando usar Retrieval Augmented Generation',
      urls: [
        { label: 'Bedrock Custom Models', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/custom-models.html' },
        { label: 'Bedrock Knowledge Bases (RAG)', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html' },
      ],
    },
    {
      name: 'Parametros de Inferencia',
      description: 'Temperature, top-p, top-k, tokens, stop sequences',
      urls: [
        { label: 'Bedrock Inference Parameters', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/inference-parameters.html' },
      ],
    },
  ],
  3: [
    {
      name: 'Amazon Bedrock',
      description: 'APIs, modelos, knowledge bases, agents, guardrails, playgrounds',
      urls: [
        { label: 'Amazon Bedrock User Guide', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html' },
        { label: 'Bedrock Agents', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html' },
        { label: 'Bedrock Guardrails', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html' },
      ],
    },
    {
      name: 'Amazon Q',
      description: 'Amazon Q Business, Amazon Q Developer, casos de uso',
      urls: [
        { label: 'Amazon Q Business', url: 'https://docs.aws.amazon.com/amazonq/latest/business-use-dg/what-is.html' },
        { label: 'Amazon Q Developer', url: 'https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/what-is.html' },
      ],
    },
    {
      name: 'Amazon SageMaker',
      description: 'JumpStart, endpoints, entrenamiento, deploy de modelos',
      urls: [
        { label: 'SageMaker JumpStart', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/studio-jumpstart.html' },
        { label: 'SageMaker User Guide', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/whatis.html' },
      ],
    },
    {
      name: 'Seleccion y Optimizacion de Modelos',
      description: 'Criterios de seleccion, optimizacion de costos, inferencia, proveedores',
      urls: [
        { label: 'Bedrock Model Providers', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html' },
        { label: 'Bedrock Pricing', url: 'https://aws.amazon.com/bedrock/pricing/' },
        { label: 'Model Evaluation in Bedrock', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-evaluation.html' },
      ],
    },
  ],
  4: [
    {
      name: 'Sesgo y Equidad',
      description: 'Deteccion de sesgos, metricas de equidad, mitigacion',
      urls: [
        { label: 'SageMaker Clarify', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-configure-processing-jobs.html' },
        { label: 'AWS AI Fairness', url: 'https://aws.amazon.com/machine-learning/responsible-ai/' },
      ],
    },
    {
      name: 'Transparencia y Explicabilidad',
      description: 'Model cards, AI service cards, SHAP, feature importance',
      urls: [
        { label: 'SageMaker Model Cards', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/model-cards.html' },
        { label: 'AWS AI Service Cards', url: 'https://aws.amazon.com/machine-learning/responsible-ai/ai-service-cards/' },
      ],
    },
    {
      name: 'IA Responsable y Guardrails',
      description: 'Principios de IA responsable, Bedrock Guardrails, toxicidad, human-in-the-loop',
      urls: [
        { label: 'AWS Responsible AI', url: 'https://aws.amazon.com/machine-learning/responsible-ai/' },
        { label: 'Bedrock Guardrails', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html' },
        { label: 'Human Review with A2I', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/a2i-use-augmented-ai-a2i-human-review-loops.html' },
      ],
    },
  ],
  5: [
    {
      name: 'Cifrado y Seguridad de Datos',
      description: 'Cifrado en reposo y en transito, KMS, VPC, PrivateLink',
      urls: [
        { label: 'Bedrock Security', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/security.html' },
        { label: 'SageMaker Security', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/security.html' },
        { label: 'AWS KMS', url: 'https://docs.aws.amazon.com/kms/latest/developerguide/overview.html' },
      ],
    },
    {
      name: 'IAM y Control de Acceso',
      description: 'Politicas IAM para servicios de IA, roles, permisos',
      urls: [
        { label: 'Bedrock IAM', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/security-iam.html' },
        { label: 'SageMaker IAM', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/security-iam.html' },
      ],
    },
    {
      name: 'Privacidad y Cumplimiento',
      description: 'PII, data masking, Amazon Macie, GDPR, HIPAA, compliance frameworks',
      urls: [
        { label: 'Amazon Macie', url: 'https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html' },
        { label: 'AWS Compliance', url: 'https://aws.amazon.com/compliance/' },
        { label: 'AWS Data Privacy', url: 'https://aws.amazon.com/compliance/data-privacy/' },
      ],
    },
    {
      name: 'Gobernanza y Auditoria',
      description: 'CloudTrail, AWS Config, model governance, model registry',
      urls: [
        { label: 'AWS CloudTrail', url: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html' },
        { label: 'SageMaker Model Registry', url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html' },
        { label: 'AWS Config', url: 'https://docs.aws.amazon.com/config/latest/developerguide/WhatIsConfig.html' },
      ],
    },
  ],
};
