const JobRepository  = require('../repositories/JobRepository');

class JobService {

  constructor() {
    this.JobRepository = new JobRepository();
  }

  async getAllJobs() {
    try {

      const jobs = await this.JobRepository.getAllJobs();
      return jobs

    } catch (error) {
      throw error;
    }
  }
}

module.exports = new JobService();
