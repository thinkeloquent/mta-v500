import { DataTypes, Model, Optional } from 'sequelize';

import { sequelize } from '../database/index.js';

/**
 * ChecklistInstance attributes interface
 */
export interface ChecklistInstanceAttributes {
  id: number;
  checklistId: string;
  templateRef: string;
  generatedAt: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ChecklistInstance creation attributes (id, timestamps are auto-generated)
 */
export interface ChecklistInstanceCreationAttributes
  extends Optional<ChecklistInstanceAttributes, 'id' | 'metadata' | 'createdAt' | 'updatedAt'> {}

/**
 * ChecklistInstance model class
 */
export class ChecklistInstance
  extends Model<ChecklistInstanceAttributes, ChecklistInstanceCreationAttributes>
  implements ChecklistInstanceAttributes
{
  declare id: number;
  declare checklistId: string;
  declare templateRef: string;
  declare generatedAt: Date;
  declare metadata: Record<string, unknown>;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Association placeholders (will be populated by associate method)
  declare Steps?: Array<typeof import('./ChecklistStep.js').ChecklistStep>;

  /**
   * Define associations
   * Called after all models are loaded
   */
  static associate(models: { ChecklistStep: typeof import('./ChecklistStep.js').ChecklistStep }): void {
    ChecklistInstance.hasMany(models.ChecklistStep, {
      sourceKey: 'checklistId',
      foreignKey: 'checklistId',
      as: 'steps',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  }
}

/**
 * Initialize ChecklistInstance model
 */
ChecklistInstance.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    checklistId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      field: 'checklist_id',
    },
    templateRef: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'template_ref',
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'generated_at',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
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
    tableName: 'checklist_instances',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_checklist_id',
        fields: ['checklist_id'],
      },
      {
        name: 'idx_template_ref',
        fields: ['template_ref'],
      },
      {
        name: 'idx_generated_at',
        fields: ['generated_at'],
      },
    ],
  }
);

export default ChecklistInstance;
