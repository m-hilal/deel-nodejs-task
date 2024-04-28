const { Job } = require('../models/model');

class JobRepository {

  constructor() {
    this.model = Job;
  }

  async getAllJobs() {
    try {
      const jobs = await Job.findAll();
      return jobs;
    } catch (error) {
      throw error;
    }
  }
}
module.exports = JobRepository;