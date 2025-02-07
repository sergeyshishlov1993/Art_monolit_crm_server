"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("Orders", [
      {
        id: "f398ee8a-ed60-4e00-a082-de7a3e2b7930",
        first_name: "John",
        second_name: "Doe",
        phone: "+123456789",
        comment:
          "Lorem Ipsum - это текст-рыба, часто используемый в печати и вэб-дизайне. Lorem Ipsum является стандартной  для текстов на латинице с начала XVI века. В то время некий безымянный печатник создал большую коллекцию размеров и форм шрифтов, используя Lorem Ipsum для распечатки образцов. Lorem Ipsum не только",
        name: "Product A",
        address: "123 Street Name",
        prepayment: "20",
        pay: "80",
        totalPrice: "100",
        sale: "20",
        status: "Pending",
        source: "Online",
        store: "Main Store",
        storeAddress: "Космическая 63",
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Orders", null, {});
  },
};
