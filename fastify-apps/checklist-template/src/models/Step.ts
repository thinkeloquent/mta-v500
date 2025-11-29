import { DataTypes, Model, Optional } from 'sequelize';

import { sequelize } from '../database/index.js';

/**
 * Step attributes interface
 */
export interface StepAttributes {
  id: number;
  stepId: string;
  templateId: string;
  order: number;
  title: string;
  description: string | null;
  required: boolean;
  tags: string[];
  dependencies: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Step creation attributes (id, timestamps are auto-generated)
 */
export interface StepCreationAttributes
  extends Optional<StepAttributes, 'id' | 'description' | 'required' | 'tags' | 'dependencies' | 'createdAt' | 'updatedAt'> {}

/**
 * Step model class
 */
export class Step extends Model<StepAttributes, StepCreationAttributes> implements StepAttributes {
  declare id: number;
  declare stepId: string;
  declare templateId: string;
  declare order: number;
  declare title: string;
  declare description: string | null;
  declare required: boolean;
  declare tags: string[];
  declare dependencies: string[];
  declare createdAt: Date;
  declare updatedAt: Date;

  // Association placeholders
  declare Template?: typeof import('./Template.js').Template;

  /**
   * Define associations
   * Called after all models are loaded
   */
  static associate(models: { Template: typeof import('./Template.js').Template }): void {
    Step.belongsTo(models.Template, {
      foreignKey: 'templateId',
      as: 'template',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  }
}

/**
 * Initialize Step model
 */
Step.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    stepId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'step_id',
    },
    templateId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'template_id',
      references: {
        model: 'templates',
        key: 'template_id',
      },
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    dependencies: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'steps',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_steps_step_id',
        fields: ['step_id'],
      },
      {
        name: 'idx_steps_template_id',
        fields: ['template_id'],
      },
      {
        name: 'idx_steps_template_step',
        unique: true,
        fields: ['template_id', 'step_id'],
      },
      {
        name: 'idx_steps_template_order',
        fields: ['template_id', 'order'],
      },
    ],
  }
);

export default Step;
