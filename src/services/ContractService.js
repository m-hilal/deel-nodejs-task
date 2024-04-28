const ContractRepository = require('../repositories/ContractRepository');

class ContractService {

  constructor() {
    this.ContractRepository = ContractRepository;
  }

  /**
   * 
   * @returns Get All Contracts
   */
  async getAllContracts() {
    try {

      const Contracts = await this.ContractRepository.getAllContracts();
      return Contracts

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get Contract By Id
   * @param {*} ContractId 
   * @param {*} req 
   */
  async getContractById(ContractId, req) {
    try {


      let whereClause = '';

      if (req.profile.type == 'client') {
        whereClause = { ClientId: req.profile.id }
      } else {
        whereClause = { ContractorId: req.profile.id }
      }
      const Contracts = await this.ContractRepository.getContractById(ContractId, whereClause);
      return Contracts

    } catch (error) {
          throw error;
    }
  }

  /**
   * Get All Client Contractss
   * @returns All Client Contracts
   */
  async getAllClientContracts(req) {
    try {

      let whereClause = '';
      if (req.profile.type == 'client') {
        whereClause = { ClientId: req.profile.id }
      } else {
        whereClause = { ContractorId: req.profile.id }
      }

      const Contracts = await this.ContractRepository.getAllClientContracts(whereClause);
      return Contracts

    } catch (error) {
      throw error;
    }
  }


}

module.exports = new ContractService();
