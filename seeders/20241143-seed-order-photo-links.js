module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("OrderPhotoLinks", [
      {
        id: "a1b2c3d4-e5f6-7890-g1h2-ijklmnop1234",
        parentId: "f398ee8a-ed60-4e00-a082-de7a3e2b7930",
        url: "https://example.com/photo1.jpg",
        fileKey: "1",
        description: "Main photo of the order",
        type: "main",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "b2c3d4e5-f678-9012-g3h4-ijklmnop5678",
        parentId: "f398ee8a-ed60-4e00-a082-de7a3e2b7930",
        url: "https://example.com/photo2.jpg",
        fileKey: "2",
        description: "Additional photo of the order",
        type: "additional",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("OrderPhotoLinks", null, {});
  },
};
