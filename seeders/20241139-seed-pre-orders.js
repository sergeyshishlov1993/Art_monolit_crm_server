"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("PreOrders", [
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        second_name: "Doe",
        phone: "123456789",
        comment:
          "Lorem Ipsum - это текст-рыба, часто используемый в печати и вэб-дизайне. Lorem Ipsum является стандартной  для текстов на латинице с начала XVI века. В то время некий безымянный печатник создал большую коллекцию размеров и форм шрифтов, используя Lorem Ipsum для распечатки образцов. Lorem Ipsum не только",
        name: "Product A",
        address: "123 Main St",
        totalPrice: "100.00",
        source: "Website",
        isDraft: true,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("PreOrders", null, {});
  },
};
