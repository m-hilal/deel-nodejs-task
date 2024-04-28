const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./models/model')
const { getProfile } = require('./middleware/getProfile')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)
const { Op, where } = require('sequelize');
const ProfileService = require('./services/ProfileService');
const ContractService = require('./services/ContractService');
const JobService = require('./services/JobService');

/**
 * Get All Profiles
 */
app.get('/allProfiles', async (req, res) => {
    try {
        const profiles = await ProfileService.getAllProfiles();
        if (!profiles) return res.status(404).json({ error: "No Data Found" });
        return res.status(200).json({ success: profiles });
    } catch (error) {
        return res.status(500).json({ error:error.message });
    }
})


/**
 * Get All contracts
 */

app.get('/allContracts', async (req, res) => {
    try {
        const contracts = await ContractService.getAllContracts();
        if (!contracts) return res.status(404).json({ error: "No Data Found" });
        return res.status(200).json({ success: contracts });
    } catch (error) {
        return res.status(500).json({ error:error.message });
    }
})



/**
 * Get All Jobs
 */
app.get('/allJobs', async (req, res) => {
    try {
        const jobs = await JobService.getAllJobs();
        if (!jobs) return res.status(404).json({ error: "No Data Found" });
        return res.status(200).json({ success: jobs });
    } catch (error) {
        return res.status(500).json({ error:error.message });
    }
})

    
/**
 * Get Contract By ID
 * @returns contract by id
 */
app.get('/contracts/:id', getProfile, async (req, res) => {

    try {
        const { id } = req.params
        const contract = await ContractService.getContractById(id, req);
        if (!contract) return res.status(404).json({ error: "No Data Found" });
        return res.status(200).json({ success: contract });
    } catch (error) {
        return res.status(500).json({ error:error.message });
    }
})



/**
 * Get All Client Contractss
 * @returns All Client Contracts
 */
app.get('/contracts', getProfile, async (req, res) => {

    try {
        
        const contracts = await ContractService.getAllClientContracts(req);
        if (!contracts) return res.status(404).json({ error: "No Data Found" });
        return res.status(200).json({ success: contracts });
    } catch (error) {
        return res.status(500).json({ error:error.message });
    }
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
 * Pay for a job by client
 *
 */
app.post('/jobs/:job_id/pay', getProfile, async (req, res) => {

    if (req.profile.type == 'contractor') {
        return res.status(403).json({ error: "Only clients can pay for jobs." });
    }

    let whereClause = { ClientId: req.profile.id }
    let job_id = req.params.job_id;

    const { Job, Contract, Profile } = req.app.get('models')
    const job = await Job.findOne(
        {
            include: [
                {
                    model: Contract,
                    required: true,
                    where: { ...whereClause, status: { [Op.not]: "terminated" } }
                },
            ],
            where: {
                id: job_id,
                paid: null,
            },
        });

    if (!job) {
        return res.status(404).json({ error: "Job not available or already paid." });
    }

    let userBalance = req.profile.balance;
    const jobPrice = job.price;

    // Check if the client has sufficient balance to pay for the job
    if (userBalance < jobPrice) {
        return res.status(403).json({ error: "Insufficient balance to pay for the job." });
    }

    // Pay for the job while maintaing transcation
    const transaction = await sequelize.transaction();
    try {
        // Update job status to paid and set payment date
        await job.update({ paid: true, paymentDate: new Date() }, { transaction });

        // Deduct job price from client's balance
        const newClientBalance = (userBalance - jobPrice).toFixed(2);
        await req.profile.update({ balance: newClientBalance }, { transaction });


        // Update contractor's balance
        const contractor = await Profile.findByPk(job.Contract.ContractorId);
        const newContractorBalance = contractor.balance + jobPrice;
        await contractor.update({ balance: newContractorBalance }, { transaction });

        await transaction.commit();

        return res.status(200).json({ success: "Job successfully paid." });
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
)



/**
 * Deposits money into the the the balance of a client(userId)
 */
app.post('/balances/deposit/:userId', getProfile, async (req, res) => {

    if (req.profile.type != 'client') {
        return res.status(403).json({ error: "Only client can deposit to other clients." });
    }
    const { Job, Contract, Profile } = req.app.get('models')
    let clientId = req.params.userId

    const client = await Profile.findByPk(clientId);
    if (client.type != 'client') {
        return res.status(403).json({ error: "Only client get amount deposited." });
    }

    let whereClause = { ClientId: req.profile.id }
    const jobs = await Job.findAll({
        include: [
            {
                model: Contract,
                required: true,
                where: { ...whereClause, status: { [Op.not]: "terminated" } }
            },
        ],
        where: {
            paid: null
        },
    }
    )
    let jobsPrice = 0;
    jobs.map((j) => jobsPrice += j.price)

    // Client can't deposit more than 25% his total of jobs to pay
    let depositAmount = Math.min((0.25 * jobsPrice).toFixed(2), req.profile.balance)
    if (depositAmount > 0) {
        // Deduct amount from client's balance
        const newClientBalance = (req.profile.balance - depositAmount).toFixed(2);
        await req.profile.update({ balance: newClientBalance });

        // Deposit to given client's balance
        const newBalance = (client.balance + depositAmount).toFixed(2);
        await client.update({ balance: newBalance });

        return res.status(200).json({ success: `Amount:${depositAmount} Deposited successfully.` });
    } else {
        return res.status(403).json({ error: "Deposited amount can't be 0." });
    }
})



/**
 * Get profession that earned the most money
 * 
 */
app.get('/admin/best-profession', async (req, res) => {


    const { Job, Contract, Profile } = req.app.get('models')
    const { start, end } = req.query

    const professionEarnings = await Job.findAll({
        where: {
            paid: { [Op.not]: null },
            paymentDate: {
                [Op.between]: [start, end]
            }
        },
        include: [
            {
                model: Contract,
                required: true,
                include: [
                    {
                        model: Profile,
                        as: 'Contractor'
                    }
                ]
            },
        ],
    }
    )
    if (!professionEarnings || professionEarnings.length === 0) {
        return res.status(404).json({ error: "No data found." });
    }

    // Calculate total earnings per profession
    const professionTotals = {};
    professionEarnings.forEach(job => {
        const profession = job.Contract.Contractor.profession;
        const earnings = job.price;
        professionTotals[profession] = (professionTotals[profession] || 0) + earnings;
    });

    // Find the profession with the highest earnings
    let bestProfession = null;
    let maxEarnings = 0;
    Object.entries(professionTotals).forEach(([profession, earnings]) => {
        if (earnings > maxEarnings) {
            bestProfession = profession;
            maxEarnings = earnings;
        }
    });

    return res.json({ bestProfession, earnings: maxEarnings });
})



/**
 * Get clients the paid the most for jobs
 * @returns returns the clients the paid the most for jobs
 */
app.get('/admin/best-clients', async (req, res) => {


    const { Job, Contract, Profile } = req.app.get('models')
    const { start, end, limit } = req.query

    const Clients = await Profile.findAll({
        limit: limit || 2,
        attributes:
            ['id', 'firstName', 'lastName'],
        where: {
            type: 'client'
        },
        include: [
            {
                model: Contract,
                as: 'Client',
                required: true,
                include: [
                    {
                        model: Job,
                        required: true,
                        attributes: [
                            'price',
                        ],
                        where: {
                            paid: true,
                            paymentDate: {
                                [Op.between]: [start, end]
                            }
                        }
                    }
                ]
            },
        ]
    }
    );

    if (!Clients || Clients.length === 0) {
        return res.status(404).json({ error: "No data found." });
    }

    let oResult = [];
    Clients.forEach(client => {
        let paid = 0;
        const ClientContract = client.Client;
        ClientContract.forEach(Contract => {
            paid += Contract.Jobs.reduce((n, { price }) => n + price, 0);
        });
        const fullName = client.firstName + client.lastName;
        oResult.push({ 'id': client.id, fullName, paid });
    });

    return res.json(oResult);
})

module.exports = app;