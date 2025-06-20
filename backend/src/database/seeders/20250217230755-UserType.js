import { v4 as uuidv4 } from 'uuid';

export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert('enums', [
    {
      id: uuidv4(),
      name: 'Admin',
      key: 'userType',
      value: 1,
      description: 'A user with administrative privileges.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      key: 'userType',
      name: 'Passenger',
      value: 2,
      description: 'A user who uses the platform as a passenger.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      key: 'userType',
      name: 'Driver',
      value: 3,
      description: 'A user who uses the platform as a driver.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      key: 'userType',
      name: 'Team Coordinator',
      value: 4,
      description: 'A user who coordinates teams on the platform.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
}
export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete('enums', { key: 'userType' });
}
