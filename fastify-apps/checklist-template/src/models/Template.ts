import { DataTypes, Model, Optional } from 'sequelize';

import { sequelize } from '../database/index.js';

/**
 * Template attributes interface
 */
export interface TemplateAttributes {
  id: number;
  templateId: string;
  name: string;
  description: string | null;
  version: number;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template creation attributes (id, timestamps are auto-generated)
 */
export interface TemplateCreationAttributes
  extends Optional<TemplateAttributes, 'id' | 'description' | 'version' | 'createdAt' | 'updatedAt'> {}

/**
 * Template model class
 */
export class Template extends Model<TemplateAttributes, TemplateCreationAttributes> implements TemplateAttributes {
  declare id: number;
  declare templateId: string;
  declare name: string;
  declare description: string | null;
  declare version: number;
  declare category: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Association placeholders (will be populated by associate method)
  declare steps?: import('./Step.js').Step[];

  /**
   * Define associations
   * Called after all models are loaded
   */
  static associate(models: { Step: typeof import('./Step.js').Step }): void {
    Template.hasMany(models.Step, {
      sourceKey: 'templateId',
      foreignKey: 'templateId',
      as: 'steps',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  }
}

/**
 * Initialize Template model
 */
Template.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    templateId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      field: 'template_id',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
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
    tableName: 'templates',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_template_id',
        fields: ['template_id'],
      },
      {
        name: 'idx_category',
        fields: ['category'],
      },
      {
        name: 'idx_name',
        fields: ['name'],
      },
    ],
  }
);

export default Template;
