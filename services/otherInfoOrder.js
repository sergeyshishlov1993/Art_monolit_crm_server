const { models } = require("../models/index");
const {
  Orders,
  OrderDeads,
  OrderMaterials,
  OrderWorks,
  OrderServices,
  OrderStatuses,
  OrderPhotoLinks,
} = models;

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");

async function handleOrderDeads(orderDeads, parentId, transaction) {
  if (orderDeads && orderDeads.length > 0) {
    for (const dead of orderDeads) {
      await OrderDeads.upsert({ ...dead, parentId }, { transaction });
    }
  }
}

async function handleOrderServices(orderServices, parentId, transaction) {
  if (orderServices && orderServices.length > 0) {
    for (const service of orderServices) {
      await OrderServices.upsert({ ...service, parentId }, { transaction });
    }
  }
}

async function handleOrderWorks(orderWorks, parentId, transaction) {
  if (orderWorks && orderWorks.length > 0) {
    for (const work of orderWorks) {
      await OrderWorks.upsert({ ...work, parentId }, { transaction });
    }
  }
}

async function deleteRelatedData(parentId, transaction) {
  await OrderDeads.destroy({ where: { parentId }, transaction });
  await OrderMaterials.destroy({ where: { parentId }, transaction });
  await OrderWorks.destroy({ where: { parentId }, transaction });
  await OrderServices.destroy({ where: { parentId }, transaction });
}

module.exports = {
  handleOrderDeads,
  handleOrderServices,
  handleOrderWorks,
  deleteRelatedData,
};
