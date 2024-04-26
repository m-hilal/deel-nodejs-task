const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const {getProfile} = require('./middleware/getProfile')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)
const { Op } = require('sequelize');

/**
 * Get All Profile
 */
app.get('/profiles', async (req, res) =>{

    const {Profile} = req.app.get('models')
  
    const profiles = await Profile.findAll()
    if(!profiles) return res.status(404).end()
    res.json(profiles)
})


/**
 * Get Contract By ID
 * @returns contract by id
 */
app.get('/contracts/:id',getProfile ,async (req, res) =>{

    let whereClause = '';

    if(req.profile.type == 'client'){
        whereClause =  {ClientId : req.profile.id}
    }else{
        whereClause =  {ContractorId : req.profile.id}
    }

    const {Contract} = req.app.get('models')
    const {id} = req.params
    const contract = await Contract.findOne({where: {id, ...whereClause}})
    if(!contract) return res.status(404).end()
    res.json(contract)
})

/**
 * Get All Contracts
 * @returns All Contracts
 */
app.get('/contracts',getProfile ,async (req, res) =>{

    let whereClause = '';

    if(req.profile.type == 'client'){
        whereClause =  {ClientId : req.profile.id}
    }else{
        whereClause =  {ContractorId : req.profile.id}
    }

    const {Contract} = req.app.get('models')
    const contract = await Contract.findAll({where: { ...whereClause, status: {[Op.not]: "terminated"}}});
    if(!contract) return res.status(404).end()
    res.json(contract)
})


/**
 * Get all unpaid jobs for a user
 * @returns Get all unpaid jobs for a user
 */
app.get('/jobs/unpaid', getProfile, async (req, res) => {

    let whereClause = '';

    if (req.profile.type == 'client') {
        whereClause = { ClientId: req.profile.id }
    } else {
        whereClause = { ContractorId: req.profile.id }
    }

    const { Job, Contract } = req.app.get('models')
    const jobs = await Job.findAll({
        include: [
            {
                model: Contract,
                required: true,
                where: { ...whereClause, status: { [Op.eq]: "in_progress" } }
            }, 
        ],
        where: {
            paid: null
        },
    }
)
    if (!jobs) return res.status(404).end()
    res.json(jobs)
})



/**
 * Pay for a job
 *
 */
app.post('/jobs/:job_id/pay', getProfile, async (req, res) => {

    if (req.profile.type == 'contractor') {
        return res.status(404).json("Not a client")
    }

    let whereClause = { ClientId: req.profile.id }
    let job_id = req.params.job_id;
    let userBalance = req.profile.balance;

    const { Job, Contract, Profile } = req.app.get('models')
    const jobs = await Job.findOne(
        {
        include: [
            {
                model: Contract,
                required: true,
                where: { ...whereClause, status: { [Op.eq]: "in_progress" } }
            }, 
        ],
        where: {
            id: job_id,
            paid : null,
            price : {[Op.lte]: userBalance}
        },
    });

    if(jobs){
        
        let userRemainingBalance = userBalance - jobs.price;
        userRemainingBalance = userRemainingBalance.toFixed(2);
        
        await Job.update(
            {  paid:true,  paymentDate: new Date()},
            {
              where: {
                id: job_id,
              },
            },
          );
    
        await Profile.update(
            { balance: userRemainingBalance},
            {
              where: {
                id: req.profile.id,
              },
            },
          );
        
        const ContractorProfile = await Profile.findByPk(jobs.Contract.ContractorId);
        ContractorProfile.balance += jobs.price;
        await ContractorProfile.save();
       
        return res.status(200).json("Job Successfully paid")
    
    }
   
    return res.status(404).json("Job not available")
   
})



module.exports = app;
