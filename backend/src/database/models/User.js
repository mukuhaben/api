/* eslint-disable func-names */
export default (sequelize, DataTypes) => {
    const User = sequelize.define(
      'User',
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING,
          unique: true,
          allowNull: false,
        },
        password: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        userType: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 2,
        },
        companyId: {
          type: DataTypes.UUID,
          allowNull: false,
          defaultValue: '123e4567-e89b-12d3-a456-426614174000',
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
        isVerified: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        idNumber: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
      }
    );
  
    return User;
  };
