const { Contract } = require('../models/model');
const { Op } = require('sequelize');

class ContractRepository {

  constructor() {
    this.model = Contract;
  }

  async getAllContracts() {
    try {
      const oResult = await Contract.findAll();
      return oResult;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 
   * @param {*} ContractId 
   * @param {*} filter 
   * @returns Get Contract By Id
   */
  async getContractById(ContractId, filter) {
    try {
     const id = ContractId;
     const contract = await Contract.findOne({ where: { id, ...filter } })
     return contract;
    } catch (error) {
      throw error;
    }
  }


/**
 * 
 * @param {*} filter 
 * @returns All Client Contracts
 */
   async getAllClientContracts(filter) {
    try {
    
     const contracts = await Contract.findAll({ where: { ...filter, status: { [Op.not]: "terminated" } } });
     return contracts;
    } catch (error) {
      throw error;
    }
  }

}
module.exports = new ContractRepository();