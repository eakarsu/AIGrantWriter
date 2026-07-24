require('dotenv').config({ path: '../.env' });
if (process.env.ALLOW_DEMO_SEED !== 'true' || process.env.NODE_ENV === 'production') {
  throw new Error('Demo seed is quarantined; set ALLOW_DEMO_SEED=true outside production to run it explicitly');
}
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function requireDemoPassword() {
  const password = process.env.DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD || process.env.DEMO_SEED_PASSWORD || '';
  if (password.length < 12 || password.length > 1024) throw new Error('DEMO_PASSWORD must contain 12-1024 characters');
  return password;
}

async function seed() {
  try {
    console.log('🌱 Starting database seed...\n');

    // Drop existing tables
    await pool.query(`
      DROP TABLE IF EXISTS ai_results CASCADE;
      DROP TABLE IF EXISTS deadlines CASCADE;
      DROP TABLE IF EXISTS impact_metrics CASCADE;
      DROP TABLE IF EXISTS budgets CASCADE;
      DROP TABLE IF EXISTS funders CASCADE;
      DROP TABLE IF EXISTS documents CASCADE;
      DROP TABLE IF EXISTS proposals CASCADE;
      DROP TABLE IF EXISTS templates CASCADE;
      DROP TABLE IF EXISTS grants CASCADE;
      DROP TABLE IF EXISTS organizations CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('✅ Dropped existing tables');

    // Create users table
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        email_verified BOOLEAN DEFAULT false,
        email_verification_token VARCHAR(255),
        email_verification_expires TIMESTAMP,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created users table');

    // Create organizations table
    await pool.query(`
      CREATE TABLE organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mission TEXT,
        description TEXT,
        website VARCHAR(255),
        contact_email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        tax_id VARCHAR(50),
        annual_budget DECIMAL(15,2),
        staff_count INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created organizations table');

    // Create grants table
    await pool.query(`
      CREATE TABLE grants (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        funder_name VARCHAR(255),
        amount_min DECIMAL(15,2),
        amount_max DECIMAL(15,2),
        deadline DATE,
        eligibility TEXT,
        focus_areas TEXT,
        description TEXT,
        requirements TEXT,
        website VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created grants table');

    // Create templates table
    await pool.query(`
      CREATE TABLE templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        content TEXT,
        fields JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created templates table');

    // Create proposals table
    await pool.query(`
      CREATE TABLE proposals (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
        grant_id INTEGER REFERENCES grants(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'draft',
        content TEXT,
        amount_requested DECIMAL(15,2),
        submission_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created proposals table');

    // Create documents table
    await pool.query(`
      CREATE TABLE documents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        doc_type VARCHAR(100),
        content TEXT,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created documents table');

    // Create budgets table
    await pool.query(`
      CREATE TABLE budgets (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
        proposal_id INTEGER REFERENCES proposals(id) ON DELETE SET NULL,
        total_amount DECIMAL(15,2),
        personnel DECIMAL(15,2),
        equipment DECIMAL(15,2),
        supplies DECIMAL(15,2),
        travel DECIMAL(15,2),
        contractual DECIMAL(15,2),
        other DECIMAL(15,2),
        indirect DECIMAL(15,2),
        status VARCHAR(50) DEFAULT 'draft',
        narrative TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created budgets table');

    // Create impact_metrics table
    await pool.query(`
      CREATE TABLE impact_metrics (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
        proposal_id INTEGER REFERENCES proposals(id) ON DELETE SET NULL,
        metric_type VARCHAR(100),
        target_value DECIMAL(15,2),
        current_value DECIMAL(15,2),
        unit VARCHAR(100),
        description TEXT,
        measurement_method TEXT,
        reporting_frequency VARCHAR(50),
        start_date DATE,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created impact_metrics table');

    // Create deadlines table
    await pool.query(`
      CREATE TABLE deadlines (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        grant_id INTEGER REFERENCES grants(id) ON DELETE SET NULL,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
        due_date DATE NOT NULL,
        reminder_date DATE,
        priority VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        task_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created deadlines table');

    // Create funders table
    await pool.query(`
      CREATE TABLE funders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        funder_type VARCHAR(100),
        website VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        address TEXT,
        focus_areas TEXT,
        geographic_focus TEXT,
        funding_range_min DECIMAL(15,2),
        funding_range_max DECIMAL(15,2),
        application_process TEXT,
        deadline_info TEXT,
        requirements TEXT,
        past_grants TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created funders table');

    // Create ai_results table
    await pool.query(`
      CREATE TABLE ai_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        tool_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        input_data JSONB,
        metadata JSONB,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
        model VARCHAR(100),
        tokens_used INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created ai_results table');

    // Seed users
    const hashedPassword = await bcrypt.hash(requireDemoPassword(), 10);
    await pool.query(`
      INSERT INTO users (email, password, name, role, email_verified) VALUES
      ('demo@grantwriter.com', $1, 'Demo User', 'user', true),
      ('admin@grantwriter.com', $1, 'Admin User', 'admin', true),
      ('john@nonprofit.org', $1, 'John Smith', 'user', true),
      ('sarah@foundation.com', $1, 'Sarah Johnson', 'user', true)
    `, [hashedPassword]);
    console.log('✅ Seeded 4 users');

    // Seed organizations (16 items)
    await pool.query(`
      INSERT INTO organizations (name, mission, description, website, contact_email, phone, address, tax_id, annual_budget, staff_count) VALUES
      ('Green Earth Foundation', 'Protecting and restoring natural ecosystems for future generations', 'A nonprofit organization dedicated to environmental conservation, habitat restoration, and climate action. We work with communities worldwide to implement sustainable solutions.', 'https://greenearthfoundation.org', 'info@greenearthfoundation.org', '555-0101', '123 Oak Street, Portland, OR 97201', '12-3456789', 2500000.00, 45),
      ('Youth Empowerment Network', 'Empowering young people through education and mentorship', 'We provide educational programs, mentorship opportunities, and skill-building workshops to underserved youth aged 12-24. Our goal is to break the cycle of poverty through education.', 'https://youthempowerment.org', 'contact@youthempowerment.org', '555-0102', '456 Main Ave, Chicago, IL 60601', '23-4567890', 1800000.00, 32),
      ('Community Health Alliance', 'Ensuring healthcare access for all community members', 'A healthcare nonprofit providing free and low-cost medical services to uninsured and underinsured individuals. We operate 5 community health centers across the metro area.', 'https://communityhealthalliance.org', 'health@communityhealthalliance.org', '555-0103', '789 Health Blvd, Houston, TX 77001', '34-5678901', 5200000.00, 120),
      ('Tech for Good Initiative', 'Bridging the digital divide through technology education', 'We provide computer literacy training, coding bootcamps, and technology access to underserved communities. Our programs have trained over 10,000 individuals since 2015.', 'https://techforgood.org', 'hello@techforgood.org', '555-0104', '321 Silicon Way, San Jose, CA 95110', '45-6789012', 1200000.00, 25),
      ('Arts & Culture Collective', 'Making arts accessible to every community', 'A nonprofit arts organization that brings visual arts, music, and theater programs to schools and community centers in low-income neighborhoods.', 'https://artsculture.org', 'arts@artsculture.org', '555-0105', '654 Gallery Lane, New York, NY 10001', '56-7890123', 950000.00, 18),
      ('Food Security Network', 'Fighting hunger and food insecurity', 'We operate food banks, community gardens, and nutrition education programs to combat hunger in our region. Last year, we distributed 2 million pounds of food.', 'https://foodsecuritynetwork.org', 'food@foodsecuritynetwork.org', '555-0106', '987 Harvest Road, Atlanta, GA 30301', '67-8901234', 3100000.00, 55),
      ('Homeless Services Coalition', 'Providing pathways out of homelessness', 'We offer emergency shelter, transitional housing, job training, and supportive services to individuals and families experiencing homelessness.', 'https://homelessservices.org', 'help@homelessservices.org', '555-0107', '147 Hope Street, Los Angeles, CA 90001', '78-9012345', 4500000.00, 85),
      ('Senior Care Foundation', 'Enhancing quality of life for seniors', 'Dedicated to supporting elderly individuals through meal delivery, companionship programs, healthcare navigation, and assisted living support services.', 'https://seniorcare.org', 'care@seniorcare.org', '555-0108', '258 Elder Avenue, Phoenix, AZ 85001', '89-0123456', 2200000.00, 40),
      ('Wildlife Conservation Society', 'Protecting endangered species and habitats', 'We work globally to protect wildlife through research, conservation programs, and policy advocacy. Our focus includes marine mammals, big cats, and tropical forests.', 'https://wildlifeconservation.org', 'wildlife@conservation.org', '555-0109', '369 Safari Drive, Denver, CO 80201', '90-1234567', 6800000.00, 150),
      ('Literacy for All', 'Building a world where everyone can read', 'We provide adult literacy programs, childrens reading initiatives, and ESL classes to help individuals achieve literacy and language proficiency.', 'https://literacyforall.org', 'read@literacyforall.org', '555-0110', '741 Book Lane, Boston, MA 02101', '01-2345678', 800000.00, 22),
      ('Clean Water Initiative', 'Ensuring access to safe drinking water', 'We implement water purification projects, well construction, and sanitation education in communities lacking clean water access, both domestically and internationally.', 'https://cleanwater.org', 'water@cleanwater.org', '555-0111', '852 Spring Street, Seattle, WA 98101', '12-3456780', 3500000.00, 60),
      ('Mental Health Matters', 'Breaking the stigma around mental health', 'We provide free counseling services, crisis intervention, support groups, and mental health education to individuals and families in need.', 'https://mentalhealthmatters.org', 'support@mentalhealthmatters.org', '555-0112', '963 Wellness Way, Miami, FL 33101', '23-4567891', 1600000.00, 35),
      ('Renewable Energy Alliance', 'Accelerating the transition to clean energy', 'A nonprofit focused on promoting renewable energy adoption through community solar projects, energy efficiency programs, and policy advocacy.', 'https://renewablealliance.org', 'energy@renewablealliance.org', '555-0113', '159 Solar Court, Austin, TX 78701', '34-5678902', 2800000.00, 42),
      ('Disability Rights Center', 'Advocating for disability inclusion and rights', 'We provide legal advocacy, accessibility consulting, and support services to individuals with disabilities to ensure equal access and opportunities.', 'https://disabilityrights.org', 'rights@disabilityrights.org', '555-0114', '357 Access Blvd, Philadelphia, PA 19101', '45-6789013', 1400000.00, 28),
      ('Veterans Support Services', 'Serving those who served our country', 'Comprehensive support for veterans including housing assistance, job placement, mental health services, and family support programs.', 'https://veteranssupport.org', 'vets@veteranssupport.org', '555-0115', '468 Honor Drive, San Diego, CA 92101', '56-7890124', 3900000.00, 70),
      ('Early Childhood Education Center', 'Building strong foundations for young learners', 'We provide high-quality early childhood education and family support services to children ages 0-5 from low-income families.', 'https://earlychildhood.org', 'learn@earlychildhood.org', '555-0116', '579 Learning Lane, Minneapolis, MN 55401', '67-8901235', 2100000.00, 48)
    `);
    console.log('✅ Seeded 16 organizations');

    // Seed grants (17 items)
    await pool.query(`
      INSERT INTO grants (title, funder_name, amount_min, amount_max, deadline, eligibility, focus_areas, description, requirements, website) VALUES
      ('Environmental Innovation Grant', 'National Environmental Foundation', 50000.00, 250000.00, '2025-04-15', '501(c)(3) nonprofits focused on environmental issues', 'Climate change, Conservation, Sustainability', 'Supports innovative projects that address environmental challenges through new technologies, approaches, or collaborations.', 'Letter of inquiry, Full proposal, Budget narrative, Organizational documents', 'https://nef.org/grants'),
      ('Youth Development Initiative', 'The Youth Foundation', 25000.00, 100000.00, '2025-03-30', 'Nonprofits serving youth ages 12-24', 'Education, Workforce development, Mentorship', 'Funding for programs that help young people develop skills, pursue education, and achieve economic independence.', 'Online application, Program evaluation plan, Letters of support', 'https://youthfoundation.org/grants'),
      ('Community Health Grant', 'Healthcare Improvement Fund', 75000.00, 500000.00, '2025-05-01', 'Healthcare nonprofits and community health centers', 'Primary care, Mental health, Health equity', 'Multi-year grants for organizations improving health outcomes in underserved communities.', 'Needs assessment, Implementation plan, Sustainability strategy', 'https://healthfund.org/apply'),
      ('Digital Equity Fund', 'Tech Forward Foundation', 30000.00, 150000.00, '2025-04-01', 'Nonprofits addressing digital divide', 'Digital literacy, Technology access, STEM education', 'Supports programs that provide technology access and digital skills training to underserved populations.', 'Program description, Impact metrics, Technology plan', 'https://techforward.org/grants'),
      ('Arts Access Grant', 'National Arts Endowment', 20000.00, 80000.00, '2025-06-15', 'Arts organizations and cultural institutions', 'Visual arts, Performing arts, Arts education', 'Funding for projects that increase access to arts programming in underserved communities.', 'Artistic statement, Community engagement plan, Sample work', 'https://artsendowment.org/apply'),
      ('Food Security Initiative', 'Hunger Relief Foundation', 40000.00, 200000.00, '2025-03-15', 'Food banks, pantries, and nutrition programs', 'Food distribution, Nutrition education, Urban farming', 'Supports organizations working to eliminate hunger and improve nutrition in their communities.', 'Capacity assessment, Distribution plan, Partnership letters', 'https://hungerrelief.org/grants'),
      ('Housing Stability Grant', 'Home Foundation', 100000.00, 750000.00, '2025-05-30', 'Housing and homeless services organizations', 'Emergency shelter, Transitional housing, Rapid rehousing', 'Multi-year funding for programs that prevent and end homelessness.', 'Housing first approach, Outcome tracking, Collaboration agreement', 'https://homefoundation.org/apply'),
      ('Senior Services Fund', 'Aging Well Foundation', 25000.00, 120000.00, '2025-04-30', 'Organizations serving adults 60+', 'Healthcare, Social services, Aging in place', 'Grants for programs that help seniors maintain independence and quality of life.', 'Needs analysis, Service delivery model, Volunteer engagement plan', 'https://agingwell.org/grants'),
      ('Wildlife Protection Grant', 'Global Conservation Trust', 150000.00, 1000000.00, '2025-07-01', 'Conservation organizations worldwide', 'Endangered species, Habitat protection, Anti-poaching', 'Major grants for high-impact conservation projects protecting endangered species and ecosystems.', 'Scientific basis, Conservation strategy, Monitoring plan', 'https://globalconservation.org/apply'),
      ('Literacy Advancement Grant', 'Reading is Fundamental', 15000.00, 60000.00, '2025-03-01', 'Literacy and education nonprofits', 'Adult literacy, Early reading, ESL programs', 'Supports evidence-based literacy programs for children and adults.', 'Curriculum overview, Assessment strategy, Volunteer training plan', 'https://rif.org/grants'),
      ('Clean Water Access Fund', 'Water.org Foundation', 50000.00, 300000.00, '2025-06-01', 'Water and sanitation nonprofits', 'Water purification, Well construction, Sanitation', 'Funding for projects providing safe drinking water and sanitation to underserved communities.', 'Technical specifications, Community engagement, Sustainability plan', 'https://waterorg.org/grants'),
      ('Mental Health Innovation Grant', 'Mind Matters Foundation', 35000.00, 175000.00, '2025-04-15', 'Mental health service providers', 'Counseling, Crisis intervention, Prevention', 'Supports innovative approaches to mental health service delivery and stigma reduction.', 'Clinical approach, Outcome measures, Crisis protocol', 'https://mindmatters.org/apply'),
      ('Clean Energy Grant', 'Sustainable Future Fund', 100000.00, 500000.00, '2025-05-15', 'Environmental and energy nonprofits', 'Solar, Wind, Energy efficiency', 'Grants for projects advancing renewable energy adoption and energy efficiency.', 'Technical feasibility, Environmental impact, Community benefit', 'https://sustainablefuture.org/grants'),
      ('Disability Inclusion Fund', 'Access for All Foundation', 30000.00, 125000.00, '2025-04-01', 'Disability services organizations', 'Accessibility, Employment, Independent living', 'Supports programs promoting inclusion and independence for people with disabilities.', 'Accessibility audit, Employment outcomes, Participant involvement', 'https://accessforall.org/grants'),
      ('Veterans Transition Grant', 'American Heroes Foundation', 50000.00, 250000.00, '2025-06-30', 'Veterans service organizations', 'Employment, Housing, Mental health', 'Funding for programs supporting veterans transitioning to civilian life.', 'Veteran involvement, Service coordination, Employment partnerships', 'https://americanheroes.org/apply'),
      ('Early Learning Grant', 'First Five Foundation', 40000.00, 200000.00, '2025-05-01', 'Early childhood education providers', 'Pre-K education, Parent engagement, Child development', 'Supports high-quality early learning programs for children from low-income families.', 'Curriculum standards, Family engagement, Quality assessment', 'https://firstfive.org/grants'),
      ('Social Enterprise Fund', 'Impact Investing Foundation', 75000.00, 400000.00, '2025-07-15', 'Social enterprises and mission-driven businesses', 'Employment, Community development, Environmental sustainability', 'Grants and loans for social enterprises creating positive community impact.', 'Business plan, Social impact metrics, Financial projections', 'https://impactinvesting.org/apply')
    `);
    console.log('✅ Seeded 17 grants');

    // Seed templates (16 items)
    await pool.query(`
      INSERT INTO templates (name, category, description, content, fields) VALUES
      ('Standard Grant Proposal', 'Proposal', 'A comprehensive template for general grant proposals', 'GRANT PROPOSAL\n\nI. EXECUTIVE SUMMARY\n[Organization overview and project summary]\n\nII. STATEMENT OF NEED\n[Description of the problem and target population]\n\nIII. PROJECT DESCRIPTION\n[Detailed project plan and activities]\n\nIV. GOALS AND OBJECTIVES\n[Measurable outcomes]\n\nV. METHODS\n[How objectives will be achieved]\n\nVI. EVALUATION PLAN\n[How success will be measured]\n\nVII. BUDGET\n[Itemized budget with justification]\n\nVIII. ORGANIZATIONAL CAPACITY\n[Qualifications and experience]\n\nIX. SUSTAINABILITY\n[Long-term funding plan]', '{"sections": ["executive_summary", "need_statement", "project_description", "goals", "methods", "evaluation", "budget", "capacity", "sustainability"]}'),
      ('Letter of Intent', 'LOI', 'Brief introduction letter for initial grant inquiries', 'LETTER OF INTENT\n\nDate: [DATE]\n\nTo: [FUNDER NAME]\n\nRE: [PROJECT TITLE]\n\n[Introduction paragraph - who you are]\n\n[Problem statement - why this matters]\n\n[Proposed solution - what you will do]\n\n[Request - amount and timeline]\n\n[Closing - contact information]\n\nSincerely,\n[SIGNATURE]', '{"fields": ["date", "funder_name", "project_title", "introduction", "problem", "solution", "request", "signature"]}'),
      ('Budget Narrative', 'Budget', 'Detailed budget explanation template', 'BUDGET NARRATIVE\n\nProject: [PROJECT NAME]\nTotal Request: $[AMOUNT]\n\nPERSONNEL\n[Staff positions and salaries]\n\nFRINGE BENEFITS\n[Benefits calculation]\n\nTRAVEL\n[Travel costs and justification]\n\nEQUIPMENT\n[Equipment needs]\n\nSUPPLIES\n[Supply costs]\n\nCONTRACTUAL\n[Consultant/contractor costs]\n\nOTHER\n[Miscellaneous costs]\n\nINDIRECT COSTS\n[Overhead rate and calculation]', '{"categories": ["personnel", "fringe", "travel", "equipment", "supplies", "contractual", "other", "indirect"]}'),
      ('Executive Summary', 'Summary', 'Compelling project overview template', 'EXECUTIVE SUMMARY\n\n[ORGANIZATION NAME] requests $[AMOUNT] to [PROJECT PURPOSE].\n\nTHE NEED:\n[Problem description]\n\nOUR SOLUTION:\n[Project approach]\n\nEXPECTED OUTCOMES:\n[Key results]\n\nORGANIZATION BACKGROUND:\n[Brief history and qualifications]', '{"fields": ["organization", "amount", "purpose", "need", "solution", "outcomes", "background"]}'),
      ('Evaluation Plan', 'Evaluation', 'Project evaluation framework template', 'EVALUATION PLAN\n\nPROJECT: [PROJECT NAME]\n\nEVALUATION QUESTIONS:\n1. [Question 1]\n2. [Question 2]\n3. [Question 3]\n\nINDICATORS:\n[Measurable indicators]\n\nDATA COLLECTION METHODS:\n[How data will be gathered]\n\nANALYSIS PLAN:\n[How data will be analyzed]\n\nREPORTING:\n[How results will be shared]', '{"sections": ["questions", "indicators", "methods", "analysis", "reporting"]}'),
      ('Logic Model', 'Planning', 'Program logic model template', 'LOGIC MODEL\n\nINPUTS:\n[Resources needed]\n\nACTIVITIES:\n[What you will do]\n\nOUTPUTS:\n[Direct products]\n\nSHORT-TERM OUTCOMES:\n[Immediate changes]\n\nMEDIUM-TERM OUTCOMES:\n[Intermediate changes]\n\nLONG-TERM OUTCOMES:\n[Ultimate impact]', '{"components": ["inputs", "activities", "outputs", "short_term", "medium_term", "long_term"]}'),
      ('Needs Assessment', 'Assessment', 'Community needs documentation template', 'NEEDS ASSESSMENT\n\nCOMMUNITY PROFILE:\n[Demographics and characteristics]\n\nPROBLEM STATEMENT:\n[Issue description]\n\nDATA SOURCES:\n[Evidence and statistics]\n\nSTAKEHOLDER INPUT:\n[Community voice]\n\nGAPS IN SERVICES:\n[Unmet needs]\n\nPRIORITY NEEDS:\n[Ranked needs list]', '{"sections": ["profile", "problem", "data", "stakeholders", "gaps", "priorities"]}'),
      ('Sustainability Plan', 'Planning', 'Long-term sustainability strategy template', 'SUSTAINABILITY PLAN\n\nCURRENT FUNDING:\n[Existing revenue sources]\n\nDIVERSIFICATION STRATEGY:\n[New funding sources]\n\nFUNDRAISING PLAN:\n[Specific activities]\n\nPARTNERSHIPS:\n[Collaborative opportunities]\n\nEARNED INCOME:\n[Revenue-generating activities]\n\nTIMELINE:\n[Implementation schedule]', '{"areas": ["current_funding", "diversification", "fundraising", "partnerships", "earned_income", "timeline"]}'),
      ('Progress Report', 'Reporting', 'Grant progress reporting template', 'PROGRESS REPORT\n\nGrant Period: [DATES]\nReporting Period: [DATES]\n\nEXECUTIVE SUMMARY:\n[Overview of progress]\n\nACTIVITIES COMPLETED:\n[What was done]\n\nOUTCOMES ACHIEVED:\n[Results to date]\n\nCHALLENGES:\n[Obstacles encountered]\n\nBUDGET STATUS:\n[Spending summary]\n\nNEXT STEPS:\n[Upcoming activities]', '{"sections": ["summary", "activities", "outcomes", "challenges", "budget", "next_steps"]}'),
      ('Final Report', 'Reporting', 'Grant final reporting template', 'FINAL REPORT\n\nProject: [PROJECT NAME]\nGrant Period: [DATES]\n\nPROJECT SUMMARY:\n[Overall description]\n\nGOALS AND ACHIEVEMENTS:\n[Objectives vs. results]\n\nIMPACT:\n[Difference made]\n\nLESSONS LEARNED:\n[Key insights]\n\nFINANCIAL SUMMARY:\n[Budget vs. actual]\n\nSUSTAINABILITY:\n[Continuation plans]\n\nACKNOWLEDGMENTS:\n[Thank funders]', '{"sections": ["summary", "achievements", "impact", "lessons", "financial", "sustainability", "acknowledgments"]}'),
      ('Board Resolution', 'Governance', 'Template for board approval documentation', 'BOARD RESOLUTION\n\nORGANIZATION: [NAME]\nDATE: [DATE]\n\nRESOLUTION:\n\nWHEREAS, [Background];\n\nWHEREAS, [Justification];\n\nNOW, THEREFORE, BE IT RESOLVED that [Action];\n\nFURTHER RESOLVED that [Additional actions].\n\nCERTIFIED:\n[Secretary signature]', '{"fields": ["organization", "date", "background", "justification", "action", "additional_actions", "signature"]}'),
      ('Partnership Agreement', 'Legal', 'Collaboration agreement template', 'PARTNERSHIP AGREEMENT\n\nPARTIES:\n[Organization names]\n\nPURPOSE:\n[Collaboration goals]\n\nROLES AND RESPONSIBILITIES:\n[Each partner role]\n\nRESOURCE SHARING:\n[What each contributes]\n\nDECISION MAKING:\n[How decisions are made]\n\nTERM:\n[Agreement duration]\n\nSIGNATURES:\n[Partner signatures]', '{"sections": ["parties", "purpose", "roles", "resources", "decisions", "term", "signatures"]}'),
      ('Case Statement', 'Fundraising', 'Compelling fundraising case template', 'CASE STATEMENT\n\nVISION:\n[Ultimate goal]\n\nMISSION:\n[How you achieve it]\n\nTHE PROBLEM:\n[Why action is needed]\n\nOUR SOLUTION:\n[What we do]\n\nIMPACT:\n[Results achieved]\n\nTHE OPPORTUNITY:\n[Current initiative]\n\nINVESTMENT NEEDED:\n[Funding request]\n\nJOIN US:\n[Call to action]', '{"sections": ["vision", "mission", "problem", "solution", "impact", "opportunity", "investment", "cta"]}'),
      ('Work Plan', 'Planning', 'Project implementation timeline template', 'WORK PLAN\n\nProject: [NAME]\nPeriod: [DATES]\n\nPHASE 1: [TITLE]\nActivities:\nTimeline:\nResponsible:\n\nPHASE 2: [TITLE]\nActivities:\nTimeline:\nResponsible:\n\nPHASE 3: [TITLE]\nActivities:\nTimeline:\nResponsible:\n\nMILESTONES:\n[Key checkpoints]', '{"phases": ["phase_1", "phase_2", "phase_3"], "fields": ["activities", "timeline", "responsible", "milestones"]}'),
      ('Theory of Change', 'Planning', 'Impact pathway documentation template', 'THEORY OF CHANGE\n\nULTIMATE IMPACT:\n[Long-term vision]\n\nPRECONDITIONS:\n[What must happen first]\n\nINTERVENTIONS:\n[Our activities]\n\nASSUMPTIONS:\n[Underlying beliefs]\n\nINDICATORS:\n[How we measure]\n\nEVIDENCE:\n[Research support]', '{"elements": ["impact", "preconditions", "interventions", "assumptions", "indicators", "evidence"]}'),
      ('Grant Calendar', 'Planning', 'Annual grant planning template', 'GRANT CALENDAR\n\nQ1 (Jan-Mar):\n[Deadlines and activities]\n\nQ2 (Apr-Jun):\n[Deadlines and activities]\n\nQ3 (Jul-Sep):\n[Deadlines and activities]\n\nQ4 (Oct-Dec):\n[Deadlines and activities]\n\nKEY DATES:\n[Important milestones]', '{"quarters": ["q1", "q2", "q3", "q4"], "fields": ["deadlines", "activities", "key_dates"]}')
    `);
    console.log('✅ Seeded 16 templates');

    // Seed proposals (16 items)
    await pool.query(`
      INSERT INTO proposals (title, organization_id, grant_id, status, content, amount_requested, submission_date) VALUES
      ('Green Earth Climate Action Initiative', 1, 1, 'submitted', 'Executive Summary: Green Earth Foundation proposes a comprehensive climate action initiative targeting urban communities. This project will implement community solar installations, urban tree planting, and climate education programs reaching 10,000 residents over two years.', 200000.00, '2025-02-15'),
      ('Youth STEM Education Program', 2, 4, 'draft', 'Youth Empowerment Network seeks funding to expand our STEM education program, providing coding classes, robotics workshops, and technology mentorship to 500 underserved youth annually.', 100000.00, NULL),
      ('Mobile Health Clinics Expansion', 3, 3, 'approved', 'Community Health Alliance proposes expanding our mobile health clinic program to serve three additional underserved neighborhoods, providing primary care, mental health services, and health education.', 450000.00, '2025-01-20'),
      ('Digital Skills for Seniors', 4, 4, 'submitted', 'Tech for Good Initiative proposes a digital literacy program specifically designed for seniors, helping them navigate technology, stay connected with family, and access online services.', 75000.00, '2025-02-01'),
      ('Arts in Schools Initiative', 5, 5, 'draft', 'Arts & Culture Collective seeks to bring visual arts, music, and theater programs to 15 Title I schools, serving 3,000 students who lack access to arts education.', 65000.00, NULL),
      ('Community Food Hub Development', 6, 6, 'submitted', 'Food Security Network proposes establishing a community food hub that will coordinate food rescue, operate a community kitchen, and provide nutrition education.', 175000.00, '2025-02-10'),
      ('Housing First Rapid Rehousing', 7, 7, 'approved', 'Homeless Services Coalition requests funding for a Housing First rapid rehousing program that will help 200 individuals and families secure permanent housing within 30 days.', 600000.00, '2025-01-15'),
      ('Aging in Place Support Services', 8, 8, 'draft', 'Senior Care Foundation proposes comprehensive aging-in-place services including home modifications, meal delivery, and companionship programs for isolated seniors.', 100000.00, NULL),
      ('Endangered Species Protection', 9, 9, 'submitted', 'Wildlife Conservation Society seeks funding for critical habitat protection and anti-poaching efforts for three endangered species in East Africa.', 750000.00, '2025-02-20'),
      ('Adult Literacy Expansion', 10, 10, 'pending_review', 'Literacy for All proposes expanding adult literacy services to evening and weekend hours, adding ESL classes, and implementing a volunteer tutor training program.', 50000.00, '2025-02-05'),
      ('Rural Water Access Project', 11, 11, 'approved', 'Clean Water Initiative proposes installing 50 community water wells and sanitation facilities in rural villages, serving approximately 25,000 people.', 275000.00, '2025-01-25'),
      ('Youth Mental Health First Aid', 12, 12, 'draft', 'Mental Health Matters seeks funding to train 500 teachers and youth workers in Mental Health First Aid, creating a network of support for young people.', 125000.00, NULL),
      ('Community Solar Installation', 13, 13, 'submitted', 'Renewable Energy Alliance proposes installing community solar arrays on five nonprofit facilities, reducing energy costs and demonstrating renewable energy benefits.', 400000.00, '2025-02-12'),
      ('Disability Employment Initiative', 14, 14, 'pending_review', 'Disability Rights Center proposes a comprehensive employment program including job training, placement services, and employer education for 150 individuals with disabilities.', 110000.00, '2025-02-08'),
      ('Veterans Career Transition', 15, 15, 'draft', 'Veterans Support Services seeks funding for career counseling, skills training, and job placement services for 300 transitioning veterans.', 200000.00, NULL),
      ('Early Learning Quality Initiative', 16, 16, 'submitted', 'Early Childhood Education Center proposes enhancing program quality through teacher training, curriculum development, and family engagement activities.', 150000.00, '2025-02-18')
    `);
    console.log('✅ Seeded 16 proposals');

    // Seed documents (16 items)
    await pool.query(`
      INSERT INTO documents (title, doc_type, content, organization_id) VALUES
      ('Green Earth Foundation Annual Report 2024', 'Annual Report', 'Annual Report 2024\n\nDear Friends,\n\nThis year marked significant progress in our environmental mission. We protected 5,000 acres of habitat, planted 100,000 trees, and engaged 50,000 community members in conservation activities.\n\nFinancial Summary:\nTotal Revenue: $2,850,000\nProgram Expenses: $2,200,000\nManagement: $350,000\nFundraising: $200,000\n\nLooking ahead, we remain committed to expanding our impact and protecting our planet for future generations.', 1),
      ('Youth Empowerment Strategic Plan 2025-2027', 'Strategic Plan', 'Strategic Plan 2025-2027\n\nVision: Every young person has the opportunity to reach their full potential.\n\nStrategic Goals:\n1. Expand STEM education to 1,500 youth annually\n2. Launch career mentorship program\n3. Establish two new community centers\n4. Achieve financial sustainability through diversified funding\n\nKey Performance Indicators and implementation timeline included.', 2),
      ('Community Health Needs Assessment 2024', 'Assessment', 'Community Health Needs Assessment\n\nMethodology: Survey of 2,000 residents, focus groups, provider interviews\n\nKey Findings:\n- 35% lack regular primary care access\n- Mental health services severely limited\n- Transportation major barrier to care\n- High rates of preventable chronic disease\n\nPriority Areas: Primary care access, mental health services, chronic disease management', 3),
      ('Tech for Good Impact Report', 'Impact Report', 'Impact Report 2024\n\nProgram Outcomes:\n- 2,500 individuals completed digital literacy training\n- 500 earned industry certifications\n- 85% employment rate among graduates\n- 150 computers distributed to families\n\nTestimonials and success stories demonstrate transformative impact of technology education.', 4),
      ('Arts & Culture Financial Statements', 'Financial', 'Audited Financial Statements\nFiscal Year Ending June 30, 2024\n\nStatement of Financial Position\nAssets: $1,250,000\nLiabilities: $150,000\nNet Assets: $1,100,000\n\nStatement of Activities\nRevenue: $950,000\nExpenses: $875,000\nChange in Net Assets: $75,000', 5),
      ('Food Security Network Volunteer Handbook', 'Policy', 'Volunteer Handbook\n\nWelcome to Food Security Network!\n\nVolunteer Roles:\n- Food sorting and packing\n- Distribution assistance\n- Garden maintenance\n- Client intake\n\nPolicies, safety procedures, and commitment expectations outlined for all volunteers.', 6),
      ('Homeless Services Case Management Guide', 'Procedure', 'Case Management Procedures\n\nIntake Process:\n1. Initial assessment within 24 hours\n2. Housing barrier identification\n3. Service plan development\n4. Resource coordination\n\nDocumentation requirements, confidentiality protocols, and outcome tracking procedures included.', 7),
      ('Senior Care Foundation Board Bylaws', 'Governance', 'Bylaws of Senior Care Foundation\n\nArticle I: Name and Purpose\nArticle II: Board of Directors\nArticle III: Officers\nArticle IV: Meetings\nArticle V: Committees\nArticle VI: Fiscal Policies\nArticle VII: Amendments\n\nApproved by Board: January 15, 2024', 8),
      ('Wildlife Conservation Research Summary', 'Research', 'Research Summary: Elephant Population Study\n\nStudy Period: 2022-2024\nLocation: Serengeti Ecosystem\n\nKey Findings:\n- Population increased 12% in protected areas\n- Corridor connectivity critical for migration\n- Community engagement reduced human-wildlife conflict\n\nRecommendations for expanded conservation efforts included.', 9),
      ('Literacy Program Curriculum Guide', 'Curriculum', 'Adult Literacy Curriculum Guide\n\nLevel 1: Basic Reading (0-4th grade)\nLevel 2: Intermediate (5th-8th grade)\nLevel 3: Advanced/GED Prep\n\nEach level includes lesson plans, assessment tools, and supplementary materials. Aligned with national adult education standards.', 10),
      ('Clean Water Technical Specifications', 'Technical', 'Water Well Technical Specifications\n\nBorehole Requirements:\n- Depth: 50-150 meters\n- Casing: PVC, 6-inch diameter\n- Pump: India Mark II hand pump\n\nWater Quality Standards:\nMust meet WHO guidelines for drinking water. Regular testing protocol established.', 11),
      ('Mental Health Crisis Protocol', 'Policy', 'Crisis Intervention Protocol\n\nRisk Assessment:\n- Immediate danger assessment\n- Safety planning\n- Resource mobilization\n\n24/7 Crisis Line Procedures:\n- Call triage\n- Intervention steps\n- Follow-up requirements\n\nStaff training and supervision requirements included.', 12),
      ('Renewable Energy Partnership Agreement', 'Legal', 'Partnership Agreement\n\nBetween: Renewable Energy Alliance and Metro City Schools\n\nPurpose: Installation and operation of solar energy systems\n\nTerms:\n- 25-year power purchase agreement\n- Maintenance responsibilities\n- Educational programming requirements\n- Revenue sharing model', 13),
      ('Disability Services Accessibility Audit', 'Assessment', 'Accessibility Audit Report\n\nFacility: Main Office Building\nDate: December 2024\n\nFindings:\n- Entrance: Compliant\n- Restrooms: Modifications needed\n- Signage: Braille required\n- Website: WCAG 2.1 compliance needed\n\nRemediation plan and timeline included.', 14),
      ('Veterans Program Outcomes Report', 'Report', 'Program Outcomes Report 2024\n\nParticipants Served: 450 veterans\n\nOutcomes:\n- 85% secured employment\n- 95% maintained housing\n- 78% reported improved mental health\n- 92% satisfaction rate\n\nSuccess stories and program improvement recommendations included.', 15),
      ('Early Childhood Quality Standards', 'Standards', 'Program Quality Standards\n\nDomain 1: Learning Environment\nDomain 2: Curriculum Implementation\nDomain 3: Teacher-Child Interactions\nDomain 4: Family Engagement\nDomain 5: Health and Safety\n\nAssessment rubrics and continuous improvement process outlined.', 16)
    `);
    console.log('✅ Seeded 16 documents');

    // Seed budgets (16 items)
    await pool.query(`
      INSERT INTO budgets (title, organization_id, proposal_id, total_amount, personnel, equipment, supplies, travel, contractual, other, indirect, status, narrative) VALUES
      ('Climate Action Initiative Budget', 1, 1, 200000.00, 85000.00, 45000.00, 15000.00, 10000.00, 25000.00, 5000.00, 15000.00, 'approved', 'Personnel includes project manager and two field coordinators. Equipment covers solar panel installations and monitoring systems.'),
      ('STEM Education Program Budget', 2, 2, 100000.00, 50000.00, 25000.00, 10000.00, 5000.00, 5000.00, 2500.00, 2500.00, 'draft', 'Focused on instructor salaries, computer equipment, and curriculum materials for 500 students.'),
      ('Mobile Health Clinics Budget', 3, 3, 450000.00, 220000.00, 120000.00, 35000.00, 25000.00, 20000.00, 10000.00, 20000.00, 'approved', 'Primary costs are medical staff salaries and vehicle/equipment expenses for three mobile clinics.'),
      ('Digital Skills for Seniors Budget', 4, 4, 75000.00, 35000.00, 20000.00, 8000.00, 2000.00, 5000.00, 2500.00, 2500.00, 'submitted', 'Budget supports instructors, tablets, and accessibility software for senior-focused tech training.'),
      ('Arts in Schools Budget', 5, 5, 65000.00, 30000.00, 15000.00, 10000.00, 3000.00, 4000.00, 1500.00, 1500.00, 'draft', 'Covers teaching artists, art supplies, and program materials for 15 schools.'),
      ('Community Food Hub Budget', 6, 6, 175000.00, 70000.00, 50000.00, 20000.00, 5000.00, 15000.00, 7500.00, 7500.00, 'submitted', 'Kitchen equipment, refrigeration, and staff for food rescue and distribution operations.'),
      ('Housing First Program Budget', 7, 7, 600000.00, 280000.00, 30000.00, 15000.00, 10000.00, 200000.00, 35000.00, 30000.00, 'approved', 'Major costs include case managers, housing subsidies, and support services.'),
      ('Aging in Place Services Budget', 8, 8, 100000.00, 55000.00, 20000.00, 10000.00, 5000.00, 5000.00, 2500.00, 2500.00, 'draft', 'Supports home modification specialists, meal delivery, and companionship program.'),
      ('Wildlife Protection Budget', 9, 9, 750000.00, 320000.00, 180000.00, 80000.00, 60000.00, 50000.00, 30000.00, 30000.00, 'submitted', 'Ranger salaries, monitoring equipment, and community engagement programs.'),
      ('Adult Literacy Expansion Budget', 10, 10, 50000.00, 25000.00, 8000.00, 7000.00, 2000.00, 4000.00, 2000.00, 2000.00, 'pending', 'Instructor fees, learning materials, and volunteer training program.'),
      ('Rural Water Access Budget', 11, 11, 275000.00, 80000.00, 120000.00, 30000.00, 20000.00, 15000.00, 5000.00, 5000.00, 'approved', 'Well drilling equipment, materials, and community education programs.'),
      ('Mental Health First Aid Budget', 12, 12, 125000.00, 65000.00, 20000.00, 15000.00, 10000.00, 10000.00, 2500.00, 2500.00, 'draft', 'Trainer certification, training materials, and participant support resources.'),
      ('Community Solar Budget', 13, 13, 400000.00, 100000.00, 220000.00, 25000.00, 15000.00, 20000.00, 10000.00, 10000.00, 'submitted', 'Solar panel systems, installation labor, and community education.'),
      ('Disability Employment Budget', 14, 14, 110000.00, 60000.00, 15000.00, 10000.00, 5000.00, 12000.00, 4000.00, 4000.00, 'pending', 'Job coaches, assistive technology, and employer partnership development.'),
      ('Veterans Career Budget', 15, 15, 200000.00, 100000.00, 30000.00, 20000.00, 15000.00, 20000.00, 7500.00, 7500.00, 'draft', 'Career counselors, training programs, and employer engagement activities.'),
      ('Early Learning Quality Budget', 16, 16, 150000.00, 80000.00, 25000.00, 20000.00, 8000.00, 10000.00, 3500.00, 3500.00, 'submitted', 'Teacher professional development, curriculum materials, and family engagement.')
    `);
    console.log('✅ Seeded 16 budgets');

    // Seed impact_metrics (16 items)
    await pool.query(`
      INSERT INTO impact_metrics (title, organization_id, proposal_id, metric_type, target_value, current_value, unit, description, measurement_method, reporting_frequency, start_date, end_date, status) VALUES
      ('Trees Planted', 1, 1, 'output', 10000, 3500, 'trees', 'Number of trees planted through urban reforestation program', 'Direct count by field staff', 'monthly', '2025-01-01', '2025-12-31', 'active'),
      ('Youth Participants', 2, 2, 'output', 500, 125, 'participants', 'Number of youth enrolled in STEM programs', 'Registration tracking system', 'monthly', '2025-01-01', '2025-12-31', 'active'),
      ('Patients Served', 3, 3, 'output', 5000, 1800, 'patients', 'Number of patients receiving care through mobile clinics', 'Electronic health records', 'weekly', '2025-01-01', '2025-12-31', 'active'),
      ('Digital Literacy Rate', 4, 4, 'outcome', 85, 62, 'percent', 'Percentage of seniors passing digital skills assessment', 'Pre/post assessment scores', 'quarterly', '2025-01-01', '2025-12-31', 'active'),
      ('Student Arts Engagement', 5, 5, 'outcome', 3000, 0, 'students', 'Students participating in arts programming', 'School attendance records', 'monthly', '2025-03-01', '2025-12-31', 'pending'),
      ('Meals Distributed', 6, 6, 'output', 100000, 35000, 'meals', 'Number of meals distributed through food programs', 'Distribution tracking system', 'weekly', '2025-01-01', '2025-12-31', 'active'),
      ('Housing Placements', 7, 7, 'output', 200, 85, 'placements', 'Individuals/families placed in permanent housing', 'Case management database', 'monthly', '2025-01-01', '2025-12-31', 'active'),
      ('Senior Independence', 8, 8, 'outcome', 90, 0, 'percent', 'Percentage of seniors maintaining independent living', 'Follow-up surveys and assessments', 'quarterly', '2025-04-01', '2025-12-31', 'pending'),
      ('Species Population', 9, 9, 'impact', 15, 0, 'percent', 'Percentage increase in protected species population', 'Field research and monitoring', 'annually', '2025-01-01', '2027-12-31', 'active'),
      ('Literacy Improvement', 10, 10, 'outcome', 75, 45, 'percent', 'Participants improving reading level by at least one grade', 'Standardized literacy assessments', 'quarterly', '2025-01-01', '2025-12-31', 'active'),
      ('Clean Water Access', 11, 11, 'impact', 25000, 12000, 'people', 'People gaining access to clean drinking water', 'Community surveys and well usage data', 'quarterly', '2025-01-01', '2025-12-31', 'active'),
      ('Mental Health Training', 12, 12, 'output', 500, 0, 'trainees', 'Teachers/youth workers trained in Mental Health First Aid', 'Training completion records', 'monthly', '2025-04-01', '2025-12-31', 'pending'),
      ('Energy Savings', 13, 13, 'impact', 500000, 125000, 'kWh', 'Annual energy savings from solar installations', 'Utility meter readings', 'monthly', '2025-01-01', '2025-12-31', 'active'),
      ('Employment Rate', 14, 14, 'outcome', 75, 0, 'percent', 'Percentage of participants gaining employment', 'Employment verification database', 'quarterly', '2025-04-01', '2025-12-31', 'pending'),
      ('Veteran Job Placements', 15, 15, 'output', 300, 0, 'placements', 'Veterans placed in employment', 'Placement tracking system', 'monthly', '2025-05-01', '2025-12-31', 'pending'),
      ('School Readiness', 16, 16, 'outcome', 90, 78, 'percent', 'Percentage of children meeting kindergarten readiness benchmarks', 'Standardized assessment tools', 'quarterly', '2025-01-01', '2025-12-31', 'active')
    `);
    console.log('✅ Seeded 16 impact metrics');

    // Seed deadlines (16 items)
    await pool.query(`
      INSERT INTO deadlines (title, grant_id, organization_id, due_date, reminder_date, priority, status, notes, task_type) VALUES
      ('Environmental Innovation Grant - LOI Due', 1, 1, '2025-02-15', '2025-02-08', 'high', 'pending', 'Submit letter of intent with project summary', 'application'),
      ('Youth Development Initiative - Full Proposal', 2, 2, '2025-03-30', '2025-03-15', 'high', 'pending', 'Complete proposal with all attachments', 'application'),
      ('Community Health Grant - Final Report', 3, 3, '2025-03-01', '2025-02-15', 'medium', 'in_progress', 'Submit Year 1 progress report', 'reporting'),
      ('Digital Equity Fund - Budget Revision', 4, 4, '2025-02-20', '2025-02-13', 'high', 'pending', 'Submit revised budget with cost adjustments', 'revision'),
      ('Arts Access Grant - Application', 5, 5, '2025-06-15', '2025-05-15', 'medium', 'pending', 'Prepare full application with work samples', 'application'),
      ('Food Security Initiative - Interim Report', 6, 6, '2025-04-15', '2025-04-01', 'medium', 'pending', 'Submit quarterly impact report', 'reporting'),
      ('Housing Stability Grant - Site Visit', 7, 7, '2025-03-10', '2025-03-03', 'high', 'pending', 'Prepare for funder site visit', 'meeting'),
      ('Senior Services Fund - Application', 8, 8, '2025-04-30', '2025-04-15', 'medium', 'pending', 'Complete online application', 'application'),
      ('Wildlife Protection Grant - Proposal', 9, 9, '2025-07-01', '2025-06-01', 'low', 'pending', 'Develop comprehensive conservation proposal', 'application'),
      ('Literacy Advancement Grant - Report', 10, 10, '2025-02-28', '2025-02-21', 'high', 'in_progress', 'Submit annual outcomes report', 'reporting'),
      ('Clean Water Access Fund - Technical Review', 11, 11, '2025-06-01', '2025-05-15', 'medium', 'pending', 'Prepare technical documentation', 'application'),
      ('Mental Health Innovation Grant - LOI', 12, 12, '2025-03-15', '2025-03-01', 'high', 'pending', 'Submit initial inquiry letter', 'application'),
      ('Clean Energy Grant - Application', 13, 13, '2025-05-15', '2025-04-30', 'medium', 'pending', 'Complete full application with engineering specs', 'application'),
      ('Disability Inclusion Fund - Proposal', 14, 14, '2025-04-01', '2025-03-15', 'high', 'pending', 'Submit proposal with accessibility plan', 'application'),
      ('Veterans Transition Grant - Application', 15, 15, '2025-06-30', '2025-06-01', 'medium', 'pending', 'Prepare comprehensive program proposal', 'application'),
      ('Early Learning Grant - Final Report', 16, 16, '2025-05-01', '2025-04-15', 'medium', 'pending', 'Submit final year grant report', 'reporting')
    `);
    console.log('✅ Seeded 16 deadlines');

    // Seed funders (16 items)
    await pool.query(`
      INSERT INTO funders (name, funder_type, website, contact_email, contact_phone, address, focus_areas, geographic_focus, funding_range_min, funding_range_max, application_process, deadline_info, requirements, past_grants, notes) VALUES
      ('National Environmental Foundation', 'Private Foundation', 'https://nef.org', 'grants@nef.org', '202-555-0100', '1000 Green Way, Washington, DC 20001', 'Environment, Climate Change, Conservation, Sustainability', 'National', 50000, 500000, 'Letter of inquiry followed by invitation to submit full proposal', 'Rolling deadlines, quarterly review', '501(c)(3) status, environmental focus, matching funds preferred', 'Funded 150 organizations in 2024 totaling $25M', 'Strong preference for measurable outcomes'),
      ('The Youth Foundation', 'Community Foundation', 'https://youthfoundation.org', 'info@youthfoundation.org', '312-555-0200', '500 Youth Blvd, Chicago, IL 60601', 'Youth Development, Education, Workforce Training', 'Midwest United States', 25000, 200000, 'Online application portal, single-stage review', 'Annual deadline in March', 'Youth-serving organizations, evidence-based programs', 'Average grant size $75,000, 40 grants annually', 'Prefers multi-year proposals'),
      ('Healthcare Improvement Fund', 'Corporate Foundation', 'https://healthfund.org', 'grants@healthfund.org', '713-555-0300', '750 Medical Center Dr, Houston, TX 77001', 'Healthcare Access, Mental Health, Health Equity', 'National with Texas priority', 75000, 1000000, 'Two-stage process: concept paper then full proposal', 'Bi-annual deadlines (May and November)', 'Healthcare nonprofits, community health centers', 'Major funder of community health, $40M distributed in 2024', 'Multi-year grants available'),
      ('Tech Forward Foundation', 'Corporate Foundation', 'https://techforward.org', 'apply@techforward.org', '408-555-0400', '100 Innovation Way, San Jose, CA 95110', 'Digital Equity, STEM Education, Technology Access', 'National', 30000, 250000, 'Online application with technology plan required', 'Quarterly deadlines', 'Focus on underserved communities, scalable solutions', 'Supports 100+ tech education programs nationally', 'Equipment donations also available'),
      ('National Arts Endowment', 'Government Agency', 'https://artsendowment.org', 'grants@artsendowment.org', '202-555-0500', '400 Arts Circle, Washington, DC 20506', 'Visual Arts, Performing Arts, Arts Education, Cultural Preservation', 'National', 10000, 150000, 'SAM registration required, detailed application', 'Multiple deadlines throughout year', 'Arts organizations with 3+ year history', 'Largest government arts funder', 'Requires 1:1 matching funds'),
      ('Hunger Relief Foundation', 'Private Foundation', 'https://hungerrelief.org', 'grants@hungerrelief.org', '404-555-0600', '200 Harvest Road, Atlanta, GA 30301', 'Food Security, Hunger Relief, Nutrition Education', 'Southeast United States', 25000, 300000, 'Letter of inquiry then invited proposal', 'Rolling with quarterly reviews', 'Food banks, pantries, nutrition programs', 'Distributed $15M to 80 organizations in 2024', 'Capacity building grants available'),
      ('Home Foundation', 'Private Foundation', 'https://homefoundation.org', 'housing@homefoundation.org', '213-555-0700', '800 Shelter Ave, Los Angeles, CA 90001', 'Homelessness, Housing, Rapid Rehousing', 'West Coast', 100000, 1000000, 'Pre-application consultation recommended', 'Annual deadline in May', 'Housing First approach preferred', 'Largest private homeless services funder on West Coast', 'Multi-year commitments typical'),
      ('Aging Well Foundation', 'Community Foundation', 'https://agingwell.org', 'seniors@agingwell.org', '602-555-0800', '300 Elder Way, Phoenix, AZ 85001', 'Senior Services, Healthcare, Social Isolation', 'Southwest United States', 15000, 150000, 'Simple online application', 'Rolling deadlines', 'Organizations serving adults 60+', 'Funded 60 senior programs in 2024', 'Small planning grants available'),
      ('Global Conservation Trust', 'Private Foundation', 'https://globalconservation.org', 'grants@globalconservation.org', '303-555-0900', '500 Wildlife Dr, Denver, CO 80201', 'Wildlife Conservation, Habitat Protection, Anti-Poaching', 'Global', 100000, 2000000, 'Scientific review committee process', 'Annual deadline in July', 'Strong scientific basis required', 'Major international conservation funder', 'Requires detailed monitoring plan'),
      ('Reading is Fundamental', 'Nonprofit Organization', 'https://rif.org', 'grants@rif.org', '617-555-1000', '250 Book St, Boston, MA 02101', 'Literacy, Reading, Education', 'National', 10000, 100000, 'Online application with program description', 'Bi-annual (March and September)', 'Literacy-focused nonprofits', 'Supports 200+ literacy programs', 'Book donations also available'),
      ('Water.org Foundation', 'Private Foundation', 'https://waterorg.org', 'grants@waterorg.org', '206-555-1100', '600 Spring St, Seattle, WA 98101', 'Clean Water, Sanitation, Public Health', 'Global with domestic programs', 50000, 500000, 'Technical proposal with engineering specs', 'Rolling applications', 'Water and sanitation expertise required', 'Funded 100 water projects globally in 2024', 'Sustainability planning required'),
      ('Mind Matters Foundation', 'Private Foundation', 'https://mindmatters.org', 'mental@mindmatters.org', '305-555-1200', '400 Wellness Blvd, Miami, FL 33101', 'Mental Health, Counseling, Crisis Intervention', 'Southeast United States', 25000, 250000, 'Letter of inquiry with clinical approach', 'Annual deadline in April', 'Licensed mental health providers', 'Growing funder, doubled grants in 2024', 'Innovation grants for new approaches'),
      ('Sustainable Future Fund', 'Impact Fund', 'https://sustainablefuture.org', 'energy@sustainablefuture.org', '512-555-1300', '200 Solar Ave, Austin, TX 78701', 'Renewable Energy, Sustainability, Climate Action', 'National', 75000, 750000, 'Technical feasibility study required', 'Annual deadline in May', 'Clean energy projects with measurable impact', 'Focuses on replicable models', 'Technical assistance available'),
      ('Access for All Foundation', 'Private Foundation', 'https://accessforall.org', 'disability@accessforall.org', '215-555-1400', '500 Access Blvd, Philadelphia, PA 19101', 'Disability Services, Accessibility, Employment', 'Northeast United States', 20000, 200000, 'Online application with accessibility plan', 'Bi-annual (April and October)', 'Disability-led organizations preferred', 'Supports 75 disability organizations', 'Accessibility audit funding available'),
      ('American Heroes Foundation', 'Private Foundation', 'https://americanheroes.org', 'veterans@americanheroes.org', '619-555-1500', '100 Honor Way, San Diego, CA 92101', 'Veterans Services, Employment, Mental Health', 'National', 50000, 400000, 'Pre-application webinar required', 'Annual deadline in June', 'Veteran-serving organizations, veteran staff preferred', 'Largest private veteran services funder', 'Peer support programs prioritized'),
      ('First Five Foundation', 'Community Foundation', 'https://firstfive.org', 'earlylearn@firstfive.org', '612-555-1600', '750 Learning Lane, Minneapolis, MN 55401', 'Early Childhood, Education, Family Support', 'Upper Midwest', 25000, 300000, 'Site visit required for large grants', 'Rolling with quarterly reviews', 'Licensed early childhood providers', 'Funded 90 early learning programs in 2024', 'Quality improvement focus')
    `);
    console.log('✅ Seeded 16 funders');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Demo Login Credentials:');
    console.log('   Email: demo@grantwriter.com');
    console.log('Demo login users provisioned from the local environment.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
