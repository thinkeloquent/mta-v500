/**
 * Model registry and association setup
 * Import all models and set up their associations
 */

import Template from './Template.js';
import Step from './Step.js';
import ChecklistInstance from './ChecklistInstance.js';
import ChecklistStep from './ChecklistStep.js';

// Define model associations
Template.associate({ Step });
Step.associate({ Template });
ChecklistInstance.associate({ ChecklistStep });
ChecklistStep.associate({ ChecklistInstance });

// Export all models
export { Template, Step, ChecklistInstance, ChecklistStep };

// Export model interfaces
export type { TemplateAttributes, TemplateCreationAttributes } from './Template.js';
export type { StepAttributes, StepCreationAttributes } from './Step.js';
export type { ChecklistInstanceAttributes, ChecklistInstanceCreationAttributes } from './ChecklistInstance.js';
export type { ChecklistStepAttributes, ChecklistStepCreationAttributes } from './ChecklistStep.js';
