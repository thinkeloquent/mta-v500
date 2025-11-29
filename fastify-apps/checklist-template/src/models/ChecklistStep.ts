import { DataTypes, Model, Optional } from 'sequelize';

import { sequelize } from '../database/index.js';

/**
 * ChecklistStep attributes interface
 */
export interface ChecklistStepAttributes {
  id: number;
  checklistId: string;
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
 * ChecklistStep creation attributes (id, timestamps are auto-generated)
 */
export interface ChecklistStepCreationAttributes
  extends Optional<ChecklistStepAttributes, 'id' | 'description' | 'required' | 'tags' | 'dependencies' | 'createdAt' | 'updatedAt'> {}

/**
 * ChecklistStep model class
 */
export class ChecklistStep
  extends Model<ChecklistStepAttributes, ChecklistStepCreationAttributes>
  implements ChecklistStepAttributes
{
  declare id: number;
  declare checklistId: string;
  declare order: number;
  declare title: string;
  declare description: string | null;
  declare required: boolean;
  declare tags: string[];
  declare dependencies: string[];
  declare createdAt: Date;
  declare updatedAt: Date;

  // Association placeholders
  declare ChecklistInstance?: typeof import('./ChecklistInstance.js').ChecklistInstance;

  /**
   * Define associations
   * Called after all models are loaded
   */
  static associate(models: {
    ChecklistInstance: typeof import('./ChecklistInstance.js').ChecklistInstance;
  }): void {
    ChecklistStep.belongsTo(models.ChecklistInstance, {
      foreignKey: 'checklistId',
      as: 'checklistInstance',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  }
}

/**
 * Initialize ChecklistStep model
 */
ChecklistStep.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    checklistId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'checklist_id',
      references: {
        model: 'checklist_instances',
        key: 'checklist_id',
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
    tableName: 'checklist_steps',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_checklist_steps_checklist_id',
        fields: ['checklist_id'],
      },
      {
        name: 'idx_checklist_steps_order',
        fields: ['checklist_id', 'order'],
      },
    ],
  }
);

export default ChecklistStep;
