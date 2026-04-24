import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../App';
import { useToast } from '../components/Toast';
import ReactMarkdown from 'react-markdown';
import {
  FiCpu, FiFileText, FiEdit3, FiCheckSquare,
  FiTarget, FiDollarSign, FiSearch, FiZap,
  FiRefreshCw, FiCopy, FiDownload, FiCheck, FiExternalLink,
  FiPieChart, FiCalendar, FiTrendingUp
} from 'react-icons/fi';
import './AITools.css';

const AITools = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [activeTab, setActiveTab] = useState('generate');

  // Form states
  const [generateForm, setGenerateForm] = useState({
    organization_id: '',
    grant_id: '',
    additional_context: ''
  });

  const [improveForm, setImproveForm] = useState({
    text: '',
    improvement_type: 'clarity'
  });

  const [summaryForm, setSummaryForm] = useState({
    proposal_content: '',
    max_words: 300
  });

  const [matchForm, setMatchForm] = useState({
    organization_id: ''
  });

  const [reviewForm, setReviewForm] = useState({
    proposal_content: ''
  });

  const [budgetForm, setBudgetForm] = useState({
    project_description: '',
    total_amount: '',
    categories: ''
  });

  const [impactForm, setImpactForm] = useState({
    organization_id: '',
    project_description: '',
    current_metrics: ''
  });

  const [deadlineForm, setDeadlineForm] = useState({
    organization_id: ''
  });

  const [funderForm, setFunderForm] = useState({
    funder_name: '',
    organization_id: '',
    additional_info: ''
  });

  // Example data for each tool - multiple samples per tool
  const exampleData = {
    generate: [
      { label: 'STEM Education', additional_context: 'Focus on closing the digital divide for underserved youth ages 12-18. Emphasize hands-on coding workshops, robotics clubs, and mentorship from tech professionals. Highlight our 3-year track record of 90% program completion rates.' },
      { label: 'Community Health', additional_context: 'Propose a mobile health clinic serving rural communities. Key focus: preventive care, chronic disease management, and health education. We have partnerships with 3 regional hospitals and a fleet of 2 equipped vans.' },
      { label: 'Environmental Justice', additional_context: 'Clean water access initiative for low-income neighborhoods with aging infrastructure. Include water testing, filter distribution, community education, and advocacy for infrastructure upgrades. Partner with local university environmental science department.' }
    ],
    improve: [
      { label: 'Weak Draft', text: `Our organization helps kids in the community. We do a lot of good things for them like teaching and stuff. We need money to keep doing this work because it is important. The program has been running for a while now and we have helped many people. We think this grant would be good for us to get because we really need it and we will use the money wisely. Our staff works hard every day to make a difference in the lives of young people.`, improvement_type: 'persuasive' },
      { label: 'Technical Jargon', text: `The proposed intervention leverages a multi-modal pedagogical framework utilizing differentiated instructional methodologies to facilitate enhanced cognitive development outcomes among the target demographic. Through the operationalization of evidence-based best practices and the implementation of a comprehensive programmatic infrastructure, we anticipate statistically significant improvements in standardized assessment metrics across multiple domains of competency.`, improvement_type: 'clarity' },
      { label: 'Verbose Text', text: `It is important to note that our organization, which was founded in the year 2015, has been working very hard and diligently in the area of youth development for the purpose of helping young people who are between the ages of 14 and 21 years old. Over the course of the past several years, we have been able to successfully serve a total number of approximately 2,400 individual youth participants through our various different programs and services that we offer to the community. Each and every one of our dedicated and committed staff members brings a wealth of experience and expertise to the table in terms of their ability to provide high-quality programming.`, improvement_type: 'concise' }
    ],
    summary: [
      { label: 'STEM Program', proposal_content: `Youth Empowerment Through STEM Education Initiative

Introduction:
The Digital Futures Foundation proposes a comprehensive STEM education program targeting underserved youth aged 12-18 in urban communities. This initiative addresses the critical gap in technology education access that perpetuates socioeconomic disparities.

Problem Statement:
Studies show that only 18% of students in low-income school districts have access to quality computer science education, compared to 65% in affluent areas. This disparity limits career opportunities and perpetuates cycles of poverty.

Program Design:
Our program will establish after-school STEM labs in 10 community centers, providing hands-on coding workshops, robotics clubs, and mentorship from tech industry professionals. Each center will serve approximately 150 students annually.

Goals and Objectives:
1. Increase STEM proficiency scores by 40% among participants
2. Graduate 500 students from the coding bootcamp annually
3. Place 80% of program graduates in tech internships or further education
4. Train 50 community volunteers as STEM mentors

Budget Overview:
The requested $150,000 will fund equipment purchases ($50,000), instructor salaries ($60,000), curriculum development ($20,000), and operational costs ($20,000).

Evaluation:
Progress will be measured through quarterly assessments, graduation rates, and 12-month follow-up surveys tracking educational and career outcomes.

Sustainability:
Beyond the grant period, the program will be sustained through corporate sponsorships, fee-based advanced courses, and integration with the school district's official curriculum.`, max_words: 300 },
      { label: 'Food Security', proposal_content: `Community Food Security and Nutrition Program

Overview:
The Healthy Harvest Collaborative proposes a $200,000 initiative to combat food insecurity in three urban food deserts serving 15,000 residents. The 24-month program combines urban farming, nutrition education, and food distribution to create a sustainable local food system.

Need Statement:
In our target communities, 34% of households experience food insecurity. The nearest full-service grocery store is 4.2 miles away, and 60% of residents lack reliable transportation. Diet-related chronic diseases — diabetes, hypertension, and obesity — affect residents at twice the national average.

Program Components:
1. Urban Farm Network: Establish 5 community gardens and 2 hydroponic growing facilities producing 20,000 lbs of fresh produce annually
2. Mobile Farmers Market: Weekly distribution at 8 locations using a refrigerated truck
3. Nutrition Education: 40-week cooking and nutrition curriculum for 500 families
4. Food Preservation Workshops: Monthly canning, fermenting, and storage classes

Expected Outcomes:
- 3,000 families receiving fresh produce weekly
- 40% reduction in food insecurity among participants
- 25% improvement in dietary health indicators
- 12 permanent jobs created in local food production

Evaluation Plan:
Pre/post household food security surveys, health screenings, and monthly distribution tracking. Independent evaluation by State University Public Health Department.

Sustainability:
Revenue from farmers market sales, CSA subscriptions, and restaurant partnerships will cover 70% of operating costs by Year 3.`, max_words: 200 },
      { label: 'Mental Health', proposal_content: `Bridges to Wellness: Community Mental Health Access Program

The Bridges to Wellness initiative addresses the critical shortage of mental health services in rural Appalachian communities. With only 1 licensed therapist per 8,000 residents — compared to the national average of 1 per 350 — our communities face a mental health crisis compounded by poverty, isolation, and the opioid epidemic.

Program Design:
Our $175,000 program deploys a telehealth platform combined with trained community health workers to provide:
- Free virtual therapy sessions (estimated 2,400 sessions annually)
- Crisis intervention and suicide prevention hotline (24/7)
- Peer support groups in 12 community locations
- Mental health first aid training for 200 community members
- School-based counseling in 8 rural schools

The program partners with the Regional Medical Center, State University School of Social Work, and 6 community churches to maximize reach.

Target Population: 25,000 residents across 4 counties, with priority access for veterans, youth ages 12-24, and individuals in substance abuse recovery.

Budget: Telehealth platform ($35,000), Licensed clinical staff ($80,000), Community health workers ($40,000), Training and outreach ($20,000).

Measurable Goals: 60% reduction in emergency psychiatric visits, 500 individuals completing therapy programs, 85% participant satisfaction rate.`, max_words: 300 }
    ],
    match: [
      { label: 'Auto-Select Org', selectFirst: true }
    ],
    review: [
      { label: 'Weak Proposal', proposal_content: `Grant Proposal: Community Garden Initiative

We want to start a community garden in our neighborhood. The garden will be located in the empty lot on Main Street. We think this is a good idea because people need fresh vegetables.

The garden will grow tomatoes, lettuce, peppers, and other vegetables. Local residents can come and help with the planting and harvesting. We will also have some flowers to make it look nice.

We are requesting $25,000 for this project. The money will be used for:
- Seeds and plants: $2,000
- Tools: $3,000
- Soil and fertilizer: $5,000
- Fencing: $8,000
- Water system: $7,000

The project will start in spring and the garden should be ready by summer. We expect about 50 families to participate.

Our organization has been in the community for 5 years. We have done other projects before like neighborhood cleanups and holiday food drives.

We believe this garden will bring the community together and help families save money on groceries. Please consider funding our project.

Thank you for your consideration.` },
      { label: 'Strong Proposal', proposal_content: `Grant Proposal: Digital Literacy for Seniors Initiative

Executive Summary:
The Silver Connect Foundation requests $85,000 to launch a 12-month Digital Literacy for Seniors program serving 400 adults aged 65+ across 6 senior centers in Metro County. The program addresses the growing digital divide that excludes older adults from essential services including telehealth, online banking, government benefits, and social connection.

Statement of Need:
According to AARP research, 22 million Americans over 65 lack broadband internet access, and 42% report feeling "not at all confident" using digital devices. In Metro County, 38% of seniors live alone, and digital isolation has been linked to a 26% increase in depression and cognitive decline (National Institute on Aging, 2023).

Program Description:
Phase 1 (Months 1-3): Deploy 120 tablets pre-loaded with senior-friendly interfaces to 6 partner senior centers. Train 24 volunteer "Tech Buddies" using our certified curriculum.
Phase 2 (Months 4-10): Deliver 8-week progressive courses covering device basics, internet safety, telehealth access, video calling, and online services. Each cohort of 20 seniors receives 16 hours of instruction plus unlimited drop-in lab time.
Phase 3 (Months 11-12): Advanced workshops, peer teaching program launch, and sustainability planning.

Goals and Measurable Objectives:
1. 400 seniors complete the core digital literacy curriculum (pre/post assessment scores improve by minimum 60%)
2. 85% of graduates independently access at least 3 online services within 60 days
3. 75% report reduced feelings of social isolation (validated UCLA Loneliness Scale)
4. 24 trained volunteer Tech Buddies sustain the program beyond the grant period

Budget Summary:
Personnel (Program Coordinator, Tech Support): $42,000
Equipment (120 tablets, Wi-Fi hotspots): $24,000
Curriculum Development & Materials: $8,000
Volunteer Training & Support: $6,000
Evaluation (independent assessor): $5,000

Evaluation Plan:
Independent evaluation by Metro University Gerontology Department using mixed-methods approach: pre/post digital skills assessments, quarterly satisfaction surveys, 6-month follow-up interviews, and analysis of service utilization data.

Organizational Capacity:
Silver Connect Foundation has served 2,800 seniors since 2019 with a 94% program satisfaction rate. Our team includes 3 certified technology trainers and partnerships with Metro County Senior Services, the Public Library System, and 6 senior living communities.

Sustainability:
Post-grant sustainability through: volunteer Tech Buddy program (reduces staffing costs by 60%), device lending library funded by Rotary Club commitment ($15,000/year), and integration into Metro County Senior Services' annual programming budget (LOI attached).` },
      { label: 'Medium Proposal', proposal_content: `Proposal: After-School Arts Enrichment Program

Background:
Creative Minds Alliance seeks $50,000 to provide after-school arts programming for 200 elementary students in the Riverside School District. Arts education funding was cut by 45% in 2022, leaving most students without access to music, visual arts, or theater instruction.

Program Overview:
We will offer 3 after-school arts tracks running 3 days per week for 30 weeks:
- Visual Arts (painting, sculpture, digital design)
- Music (instrument instruction, choir, music production)
- Theater (acting, stagecraft, playwriting)

Each track accommodates 65-70 students and culminates in a public showcase event. Professional teaching artists lead all sessions with support from high school volunteer mentors.

Budget:
Teaching Artists (6): $30,000
Supplies & Equipment: $12,000
Showcase Events: $3,000
Administration: $5,000

We expect 80% attendance rates and measurable improvements in student engagement. Teachers will complete behavioral assessments at program start and end.

Our organization has run summer camps for 3 years serving 150 kids annually. This is our first after-school program proposal.` }
    ],
    budget: [
      { label: 'Health Clinic', project_description: `Mobile Health Clinic Initiative

This project will launch a mobile health clinic to serve rural communities lacking access to primary healthcare. The clinic, housed in a specially equipped van, will travel to 15 underserved locations weekly, providing preventive care, chronic disease management, vaccinations, health screenings, and basic laboratory services.

Key activities include:
- Operating 5 days per week across remote areas
- Providing free health screenings and preventive care
- Managing chronic conditions like diabetes and hypertension
- Conducting community health education workshops
- Coordinating referrals to specialty care when needed

The program will employ one physician, two nurse practitioners, one medical assistant, and one community health worker. We anticipate serving 5,000 patients annually.`, total_amount: '250000', categories: 'Personnel, Vehicle & Equipment, Medical Supplies, Operations, Outreach' },
      { label: 'Education Program', project_description: `After-School STEM Academy for Underserved Youth

A year-round after-school program operating in 5 Title I schools, providing coding, robotics, and science enrichment to 300 students in grades 6-8. The program runs 4 days per week during the school year and includes a 6-week summer intensive.

Staffing includes a Program Director, 5 Lead Instructors (one per site), 10 part-time Teaching Assistants, and a Data/Evaluation Coordinator. Equipment needs include laptop carts, robotics kits, 3D printers, and lab supplies for each site.

The program includes monthly family engagement nights, an annual STEM fair, and partnerships with 3 local tech companies providing mentors and field trip opportunities.`, total_amount: '150000', categories: 'Personnel, Technology & Equipment, Curriculum Materials, Family Engagement, Evaluation' },
      { label: 'Housing Program', project_description: `Transitional Housing and Employment Support Program

A comprehensive 18-month program providing transitional housing and wraparound services for 40 individuals experiencing homelessness. The program operates a 20-unit facility and provides case management, job training, mental health counseling, and permanent housing placement assistance.

Services include:
- Safe transitional housing for up to 18 months per participant
- Individual case management (1:15 ratio)
- Vocational training partnerships with local employers
- On-site mental health and substance abuse counseling
- Financial literacy workshops and savings matching program
- Permanent housing search and move-in assistance

Target: 75% of participants secure permanent housing and employment within 18 months.`, total_amount: '500000', categories: 'Facility Operations, Personnel, Client Services, Vocational Training, Housing Placement, Administration' }
    ],
    impact: [
      { label: 'Youth Mentorship', project_description: `Youth Mentorship and Career Development Program

Our program pairs at-risk youth ages 14-21 with professional mentors for a 12-month intensive program. Participants receive:
- Weekly one-on-one mentoring sessions
- Monthly career exploration workshops
- Job shadowing opportunities
- Resume writing and interview skills training
- Connections to internship and job opportunities

We target youth from low-income households, foster care, and juvenile justice system involvement. The goal is to increase high school graduation rates, college enrollment, and employment outcomes.`, current_metrics: 'Currently tracking: number of mentor matches, session attendance, participant satisfaction' },
      { label: 'Literacy Program', project_description: `Family Literacy and Early Reading Initiative

A two-generation literacy program serving 200 families with children ages 0-5 in communities where 45% of adults read below a 6th-grade level. The program provides:
- Weekly parent-child reading circles at 8 community sites
- Adult basic education and GED preparation classes
- Home library building (10 books per family per quarter)
- Training parents as their children's first literacy teachers
- Kindergarten readiness assessments and school transition support

The goal is to improve early literacy outcomes and break intergenerational cycles of low literacy.`, current_metrics: 'Tracking: program enrollment, books distributed, parent attendance at reading circles' },
      { label: 'Workforce Training', project_description: `Green Jobs Workforce Development Program

A 16-week workforce training program preparing 120 unemployed and underemployed adults annually for careers in renewable energy, energy efficiency, and sustainable construction. The program includes:
- 8 weeks of classroom instruction (solar installation, weatherization, energy auditing)
- 8 weeks of paid on-the-job training with employer partners
- Industry certification preparation (NABCEP, BPI, OSHA)
- Job placement services and 12-month post-placement support
- Supportive services (transportation, childcare, tool kits)

Target population: adults 18-55 from communities disproportionately affected by fossil fuel industry decline.`, current_metrics: 'Tracking: enrollment numbers, certification pass rates, job placement rate at 30 days' }
    ],
    deadline: [
      { label: 'Auto-Select Org', selectFirst: true }
    ],
    funder: [
      { label: 'Ford Foundation', funder_name: 'The Ford Foundation', additional_info: 'We are a nonprofit focused on education equity and youth development in urban areas. Interested in their social justice and education funding streams.' },
      { label: 'Gates Foundation', funder_name: 'Bill & Melinda Gates Foundation', additional_info: 'We run K-12 education technology programs and are exploring their US education grants. Our focus is improving math and reading outcomes through adaptive learning software.' },
      { label: 'MacArthur Foundation', funder_name: 'John D. and Catherine T. MacArthur Foundation', additional_info: 'We work on criminal justice reform and reentry programs. Looking for funding for our housing-first approach to reducing recidivism in Cook County, Illinois.' }
    ]
  };

  const loadExampleData = (toolType, index) => {
    const examples = exampleData[toolType];
    if (!examples || !examples[index]) return;
    const data = examples[index];

    switch (toolType) {
      case 'generate':
        setGenerateForm(prev => ({ ...prev, additional_context: data.additional_context }));
        toast.info(`"${data.label}" context loaded!`);
        break;
      case 'improve':
        setImproveForm({ text: data.text, improvement_type: data.improvement_type });
        toast.info(`"${data.label}" example loaded!`);
        break;
      case 'summary':
        setSummaryForm({ proposal_content: data.proposal_content, max_words: data.max_words });
        toast.info(`"${data.label}" proposal loaded!`);
        break;
      case 'match':
        if (data.selectFirst && organizations.length > 0) {
          setMatchForm({ organization_id: String(organizations[0].id) });
          toast.info(`Selected: ${organizations[0].name}`);
        } else {
          toast.warning('Add an organization first to use this example');
        }
        break;
      case 'review':
        setReviewForm({ proposal_content: data.proposal_content });
        toast.info(`"${data.label}" proposal loaded!`);
        break;
      case 'budget':
        setBudgetForm({ project_description: data.project_description, total_amount: data.total_amount, categories: data.categories });
        toast.info(`"${data.label}" project loaded!`);
        break;
      case 'impact':
        setImpactForm(prev => ({ ...prev, project_description: data.project_description, current_metrics: data.current_metrics }));
        toast.info(`"${data.label}" project loaded!`);
        break;
      case 'deadline':
        if (data.selectFirst && organizations.length > 0) {
          setDeadlineForm({ organization_id: String(organizations[0].id) });
          toast.info(`Selected: ${organizations[0].name}`);
        } else {
          toast.warning('Add an organization first to use this example');
        }
        break;
      case 'funder':
        setFunderForm(prev => ({ ...prev, funder_name: data.funder_name, additional_info: data.additional_info }));
        toast.info(`"${data.label}" funder loaded!`);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [orgsRes, grantsRes] = await Promise.all([
        api.get('/organizations'),
        api.get('/grants')
      ]);
      setOrganizations(orgsRes.data);
      setGrants(grantsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const handleGenerate = async () => {
    if (!generateForm.organization_id || !generateForm.grant_id) {
      toast.warning('Please select both an organization and a grant');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/generate-proposal', generateForm);
      const selectedGrant = grants.find(g => g.id === parseInt(generateForm.grant_id));
      const amountRequested = selectedGrant?.amount_max || selectedGrant?.amount_min || null;

      const proposalData = {
        title: `AI Generated: ${response.data.organization} - ${response.data.grant}`,
        organization_id: generateForm.organization_id,
        grant_id: generateForm.grant_id,
        status: 'draft',
        content: response.data.proposal,
        amount_requested: amountRequested,
        submission_date: new Date().toISOString().split('T')[0]
      };

      const savedProposal = await api.post('/proposals', proposalData);

      setAiResult({
        type: 'proposal',
        title: 'Generated Grant Proposal',
        content: response.data.proposal,
        meta: {
          model: response.data.model,
          organization: response.data.organization,
          grant: response.data.grant,
          tokens: response.data.usage?.total_tokens,
          savedId: savedProposal.data.id
        }
      });
      toast.success('Proposal generated and saved to drafts!');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to generate proposal';
      setAiResult({ type: 'error', title: 'Generation Error', content: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async () => {
    if (!improveForm.text.trim()) {
      toast.warning('Please enter text to improve');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/improve-text', improveForm);
      setAiResult({
        type: 'improvement',
        title: `Text Improved (${improveForm.improvement_type})`,
        content: response.data.improved_text,
        meta: { model: response.data.model, improvement_type: response.data.improvement_type, tokens: response.data.usage?.total_tokens, savedId: response.data.savedId }
      });
      toast.success('Text improved and saved!');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to improve text';
      setAiResult({ type: 'error', title: 'Error', content: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSummary = async () => {
    if (!summaryForm.proposal_content.trim()) {
      toast.warning('Please enter proposal content to summarize');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/generate-summary', summaryForm);
      setAiResult({
        type: 'summary',
        title: 'Executive Summary',
        content: response.data.summary,
        meta: { model: response.data.model, tokens: response.data.usage?.total_tokens, savedId: response.data.savedId }
      });
      toast.success('Summary generated and saved!');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to generate summary';
      setAiResult({ type: 'error', title: 'Error', content: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = async () => {
    if (!matchForm.organization_id) {
      toast.warning('Please select an organization');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/match-grants', matchForm);
      setAiResult({
        type: 'matching',
        title: 'Grant Matching Analysis',
        content: response.data.analysis,
        meta: { model: response.data.model, organization: response.data.organization, grants_analyzed: response.data.grants_analyzed, tokens: response.data.usage?.total_tokens, savedId: response.data.savedId }
      });
      toast.success('Analysis complete and saved!');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to match grants';
      setAiResult({ type: 'error', title: 'Error', content: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewForm.proposal_content.trim()) {
      toast.warning('Please enter proposal content to review');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/review-proposal', reviewForm);
      setAiResult({
        type: 'review',
        title: 'Proposal Review & Critique',
        content: response.data.review,
        meta: { model: response.data.model, tokens: response.data.usage?.total_tokens, savedId: response.data.savedId }
      });
      toast.success('Review complete and saved!');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to review proposal';
      setAiResult({ type: 'error', title: 'Error', content: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBudget = async () => {
    if (!budgetForm.project_description.trim()) {
      toast.warning('Please enter a project description');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/generate-budget', budgetForm);
      setAiResult({
        type: 'budget',
        title: 'Budget Narrative',
        content: response.data.budget,
        meta: { model: response.data.model, tokens: response.data.usage?.total_tokens, savedId: response.data.savedId }
      });
      toast.success('Budget generated and saved!');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to generate budget';
      setAiResult({ type: 'error', title: 'Error', content: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleImpact = async () => {
    if (!impactForm.project_description.trim()) {
      toast.warning('Please enter a project description');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/measure-impact', impactForm);
      setAiResult({
        type: 'impact',
        title: 'Impact Measurement Framework',
        content: response.data.impact_analysis,
        meta: { model: response.data.model, organization: response.data.organization, tokens: response.data.usage?.total_tokens, savedId: response.data.savedId }
      });
      toast.success('Impact framework generated and saved!');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to measure impact';
      setAiResult({ type: 'error', title: 'Error', content: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeadline = async () => {
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/analyze-deadlines', deadlineForm);
      setAiResult({
        type: 'deadline',
        title: 'Deadline Analysis',
        content: response.data.deadline_analysis,
        meta: { model: response.data.model, deadlines_analyzed: response.data.deadlines_analyzed, grants_analyzed: response.data.grants_analyzed, tokens: response.data.usage?.total_tokens, savedId: response.data.savedId }
      });
      toast.success('Deadline analysis complete and saved!');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to analyze deadlines';
      setAiResult({ type: 'error', title: 'Error', content: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFunder = async () => {
    if (!funderForm.funder_name.trim()) {
      toast.warning('Please enter a funder name to research');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/research-funder', funderForm);
      setAiResult({
        type: 'funder',
        title: `Funder Research: ${response.data.funder_name}`,
        content: response.data.funder_research,
        meta: { model: response.data.model, funder_name: response.data.funder_name, organization: response.data.organization, tokens: response.data.usage?.total_tokens, savedId: response.data.savedId }
      });
      toast.success('Funder research complete and saved!');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to research funder';
      setAiResult({ type: 'error', title: 'Error', content: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (aiResult?.content) {
      navigator.clipboard.writeText(aiResult.content);
      toast.success('Content copied to clipboard!');
    }
  };

  const downloadAsText = () => {
    if (aiResult?.content) {
      const blob = new Blob([aiResult.content], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${aiResult.title.toLowerCase().replace(/\s+/g, '-')}.md`;
      link.click();
      toast.success('File downloaded!');
    }
  };

  const tools = [
    { id: 'generate', icon: FiFileText, label: 'Generate Proposal', color: '#4F46E5' },
    { id: 'improve', icon: FiEdit3, label: 'Improve Text', color: '#10B981' },
    { id: 'summary', icon: FiCheckSquare, label: 'Executive Summary', color: '#F59E0B' },
    { id: 'match', icon: FiTarget, label: 'Match Grants', color: '#EC4899' },
    { id: 'review', icon: FiSearch, label: 'Review Proposal', color: '#8B5CF6' },
    { id: 'budget', icon: FiPieChart, label: 'Budget Narrative', color: '#06B6D4' },
    { id: 'impact', icon: FiTrendingUp, label: 'Impact Measurer', color: '#F97316' },
    { id: 'deadline', icon: FiCalendar, label: 'Deadline Analyzer', color: '#6366F1' },
    { id: 'funder', icon: FiDollarSign, label: 'Funder Research', color: '#14B8A6' }
  ];

  return (
    <div className="ai-tools-page">
      <div className="page-header">
        <div>
          <h1><FiCpu /> AI Tools</h1>
          <p>AI-powered tools to enhance your grant writing</p>
        </div>
      </div>

      <div className="ai-tools-container">
        <div className="tools-sidebar">
          <div className="tools-list">
            {tools.map((tool) => (
              <button
                key={tool.id}
                className={`tool-btn ${activeTab === tool.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(tool.id); setAiResult(null); }}
                style={{ '--tool-color': tool.color }}
              >
                <tool.icon />
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="tools-content">
          {/* Generate Proposal Tab */}
          {activeTab === 'generate' && (
            <div className="tool-panel">
              <div className="tool-header">
                <FiFileText className="tool-icon" style={{ color: '#4F46E5' }} />
                <div>
                  <h2>Generate Grant Proposal</h2>
                  <p>AI-powered proposal generation from organization and grant data</p>
                </div>
              </div>
              <div className="example-buttons">
                <span className="example-label">Load Sample:</span>
                {exampleData.generate.map((ex, i) => (
                  <button key={i} className="btn btn-outline btn-sm" onClick={() => loadExampleData('generate', i)}>{ex.label}</button>
                ))}
              </div>
              <div className="tool-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Organization *</label>
                    <select value={generateForm.organization_id} onChange={(e) => setGenerateForm({ ...generateForm, organization_id: e.target.value })}>
                      <option value="">Select Organization</option>
                      {organizations.map(org => (<option key={org.id} value={org.id}>{org.name}</option>))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Grant Opportunity *</label>
                    <select value={generateForm.grant_id} onChange={(e) => setGenerateForm({ ...generateForm, grant_id: e.target.value })}>
                      <option value="">Select Grant</option>
                      {grants.map(grant => (<option key={grant.id} value={grant.id}>{grant.title}</option>))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Additional Context (Optional)</label>
                  <textarea value={generateForm.additional_context} onChange={(e) => setGenerateForm({ ...generateForm, additional_context: e.target.value })} rows="3" placeholder="Add any specific requirements, focus areas, or additional information..." />
                </div>
                <button className="btn btn-primary generate-btn" onClick={handleGenerate} disabled={loading}>
                  {loading ? <><FiRefreshCw className="spinning" /> Generating...</> : <><FiZap /> Generate Proposal</>}
                </button>
              </div>
            </div>
          )}

          {/* Improve Text Tab */}
          {activeTab === 'improve' && (
            <div className="tool-panel">
              <div className="tool-header">
                <FiEdit3 className="tool-icon" style={{ color: '#10B981' }} />
                <div>
                  <h2>Improve Text</h2>
                  <p>Enhance your writing with AI-powered suggestions</p>
                </div>
              </div>
              <div className="example-buttons">
                <span className="example-label">Load Sample:</span>
                {exampleData.improve.map((ex, i) => (
                  <button key={i} className="btn btn-outline btn-sm" onClick={() => loadExampleData('improve', i)}>{ex.label}</button>
                ))}
              </div>
              <div className="tool-form">
                <div className="form-group">
                  <label>Improvement Type</label>
                  <select value={improveForm.improvement_type} onChange={(e) => setImproveForm({ ...improveForm, improvement_type: e.target.value })}>
                    <option value="clarity">Improve Clarity</option>
                    <option value="persuasive">Make More Persuasive</option>
                    <option value="concise">Make More Concise</option>
                    <option value="professional">Enhance Professional Tone</option>
                    <option value="expand">Expand with Details</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Text to Improve *</label>
                  <textarea value={improveForm.text} onChange={(e) => setImproveForm({ ...improveForm, text: e.target.value })} rows="8" placeholder="Paste your text here..." />
                </div>
                <button className="btn btn-success generate-btn" onClick={handleImprove} disabled={loading}>
                  {loading ? <><FiRefreshCw className="spinning" /> Improving...</> : <><FiZap /> Improve Text</>}
                </button>
              </div>
            </div>
          )}

          {/* Executive Summary Tab */}
          {activeTab === 'summary' && (
            <div className="tool-panel">
              <div className="tool-header">
                <FiCheckSquare className="tool-icon" style={{ color: '#F59E0B' }} />
                <div>
                  <h2>Generate Executive Summary</h2>
                  <p>Create a compelling executive summary from your proposal</p>
                </div>
              </div>
              <div className="example-buttons">
                <span className="example-label">Load Sample:</span>
                {exampleData.summary.map((ex, i) => (
                  <button key={i} className="btn btn-outline btn-sm" onClick={() => loadExampleData('summary', i)}>{ex.label}</button>
                ))}
              </div>
              <div className="tool-form">
                <div className="form-group">
                  <label>Maximum Words</label>
                  <select value={summaryForm.max_words} onChange={(e) => setSummaryForm({ ...summaryForm, max_words: parseInt(e.target.value) })}>
                    <option value="150">150 words</option>
                    <option value="200">200 words</option>
                    <option value="300">300 words</option>
                    <option value="500">500 words</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Proposal Content *</label>
                  <textarea value={summaryForm.proposal_content} onChange={(e) => setSummaryForm({ ...summaryForm, proposal_content: e.target.value })} rows="10" placeholder="Paste your full proposal content here..." />
                </div>
                <button className="btn btn-warning generate-btn" onClick={handleSummary} disabled={loading}>
                  {loading ? <><FiRefreshCw className="spinning" /> Generating...</> : <><FiZap /> Generate Summary</>}
                </button>
              </div>
            </div>
          )}

          {/* Match Grants Tab */}
          {activeTab === 'match' && (
            <div className="tool-panel">
              <div className="tool-header">
                <FiTarget className="tool-icon" style={{ color: '#EC4899' }} />
                <div>
                  <h2>Match Grants to Organization</h2>
                  <p>Find the best grant opportunities for your organization</p>
                </div>
              </div>
              <div className="example-buttons">
                <span className="example-label">Quick Start:</span>
                {exampleData.match.map((ex, i) => (
                  <button key={i} className="btn btn-outline btn-sm" onClick={() => loadExampleData('match', i)}>{ex.label}</button>
                ))}
              </div>
              <div className="tool-form">
                <div className="form-group">
                  <label>Organization *</label>
                  <select value={matchForm.organization_id} onChange={(e) => setMatchForm({ ...matchForm, organization_id: e.target.value })}>
                    <option value="">Select Organization</option>
                    {organizations.map(org => (<option key={org.id} value={org.id}>{org.name}</option>))}
                  </select>
                </div>
                <p className="tool-hint">This will analyze your organization's profile against all available grants and provide match scores, alignment points, and recommendations.</p>
                <button className="btn generate-btn" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)', color: 'white' }} onClick={handleMatch} disabled={loading}>
                  {loading ? <><FiRefreshCw className="spinning" /> Analyzing...</> : <><FiZap /> Analyze Matches</>}
                </button>
              </div>
            </div>
          )}

          {/* Review Proposal Tab */}
          {activeTab === 'review' && (
            <div className="tool-panel">
              <div className="tool-header">
                <FiSearch className="tool-icon" style={{ color: '#8B5CF6' }} />
                <div>
                  <h2>Review & Critique Proposal</h2>
                  <p>Get expert feedback on your proposal</p>
                </div>
              </div>
              <div className="example-buttons">
                <span className="example-label">Load Sample:</span>
                {exampleData.review.map((ex, i) => (
                  <button key={i} className="btn btn-outline btn-sm" onClick={() => loadExampleData('review', i)}>{ex.label}</button>
                ))}
              </div>
              <div className="tool-form">
                <div className="form-group">
                  <label>Proposal Content *</label>
                  <textarea value={reviewForm.proposal_content} onChange={(e) => setReviewForm({ ...reviewForm, proposal_content: e.target.value })} rows="10" placeholder="Paste your proposal content for review..." />
                </div>
                <button className="btn generate-btn" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', color: 'white' }} onClick={handleReview} disabled={loading}>
                  {loading ? <><FiRefreshCw className="spinning" /> Reviewing...</> : <><FiZap /> Review Proposal</>}
                </button>
              </div>
            </div>
          )}

          {/* Budget Narrative Tab */}
          {activeTab === 'budget' && (
            <div className="tool-panel">
              <div className="tool-header">
                <FiPieChart className="tool-icon" style={{ color: '#06B6D4' }} />
                <div>
                  <h2>Generate Budget Narrative</h2>
                  <p>Create a detailed budget breakdown for your grant</p>
                </div>
              </div>
              <div className="example-buttons">
                <span className="example-label">Load Sample:</span>
                {exampleData.budget.map((ex, i) => (
                  <button key={i} className="btn btn-outline btn-sm" onClick={() => loadExampleData('budget', i)}>{ex.label}</button>
                ))}
              </div>
              <div className="tool-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Total Amount Requested ($)</label>
                    <input type="number" value={budgetForm.total_amount} onChange={(e) => setBudgetForm({ ...budgetForm, total_amount: e.target.value })} placeholder="e.g., 100000" />
                  </div>
                  <div className="form-group">
                    <label>Budget Categories</label>
                    <input type="text" value={budgetForm.categories} onChange={(e) => setBudgetForm({ ...budgetForm, categories: e.target.value })} placeholder="e.g., Personnel, Equipment, Travel" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Project Description *</label>
                  <textarea value={budgetForm.project_description} onChange={(e) => setBudgetForm({ ...budgetForm, project_description: e.target.value })} rows="6" placeholder="Describe your project and its activities..." />
                </div>
                <button className="btn generate-btn" style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)', color: 'white' }} onClick={handleBudget} disabled={loading}>
                  {loading ? <><FiRefreshCw className="spinning" /> Generating...</> : <><FiZap /> Generate Budget</>}
                </button>
              </div>
            </div>
          )}

          {/* Impact Measurer Tab */}
          {activeTab === 'impact' && (
            <div className="tool-panel">
              <div className="tool-header">
                <FiTrendingUp className="tool-icon" style={{ color: '#F97316' }} />
                <div>
                  <h2>AI Impact Measurer</h2>
                  <p>Create a comprehensive impact measurement framework</p>
                </div>
              </div>
              <div className="example-buttons">
                <span className="example-label">Load Sample:</span>
                {exampleData.impact.map((ex, i) => (
                  <button key={i} className="btn btn-outline btn-sm" onClick={() => loadExampleData('impact', i)}>{ex.label}</button>
                ))}
              </div>
              <div className="tool-form">
                <div className="form-group">
                  <label>Organization (Optional)</label>
                  <select value={impactForm.organization_id} onChange={(e) => setImpactForm({ ...impactForm, organization_id: e.target.value })}>
                    <option value="">Select Organization</option>
                    {organizations.map(org => (<option key={org.id} value={org.id}>{org.name}</option>))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Project Description *</label>
                  <textarea value={impactForm.project_description} onChange={(e) => setImpactForm({ ...impactForm, project_description: e.target.value })} rows="5" placeholder="Describe your project, goals, and target population..." />
                </div>
                <div className="form-group">
                  <label>Current Metrics (Optional)</label>
                  <textarea value={impactForm.current_metrics} onChange={(e) => setImpactForm({ ...impactForm, current_metrics: e.target.value })} rows="2" placeholder="List any metrics you're already tracking..." />
                </div>
                <button className="btn generate-btn" style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', color: 'white' }} onClick={handleImpact} disabled={loading}>
                  {loading ? <><FiRefreshCw className="spinning" /> Analyzing...</> : <><FiTrendingUp /> Generate Impact Framework</>}
                </button>
              </div>
            </div>
          )}

          {/* Deadline Analyzer Tab */}
          {activeTab === 'deadline' && (
            <div className="tool-panel">
              <div className="tool-header">
                <FiCalendar className="tool-icon" style={{ color: '#6366F1' }} />
                <div>
                  <h2>AI Deadline Analyzer</h2>
                  <p>Get AI-powered prioritization and planning recommendations</p>
                </div>
              </div>
              <div className="example-buttons">
                <span className="example-label">Quick Start:</span>
                {exampleData.deadline.map((ex, i) => (
                  <button key={i} className="btn btn-outline btn-sm" onClick={() => loadExampleData('deadline', i)}>{ex.label}</button>
                ))}
              </div>
              <div className="tool-form">
                <div className="form-group">
                  <label>Organization (Optional)</label>
                  <select value={deadlineForm.organization_id} onChange={(e) => setDeadlineForm({ ...deadlineForm, organization_id: e.target.value })}>
                    <option value="">All Organizations</option>
                    {organizations.map(org => (<option key={org.id} value={org.id}>{org.name}</option>))}
                  </select>
                </div>
                <p className="tool-hint">Analyze all your deadlines and grant opportunities to get strategic recommendations for prioritization and resource allocation.</p>
                <button className="btn generate-btn" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: 'white' }} onClick={handleDeadline} disabled={loading}>
                  {loading ? <><FiRefreshCw className="spinning" /> Analyzing...</> : <><FiCalendar /> Analyze Deadlines</>}
                </button>
              </div>
            </div>
          )}

          {/* Funder Research Tab */}
          {activeTab === 'funder' && (
            <div className="tool-panel">
              <div className="tool-header">
                <FiDollarSign className="tool-icon" style={{ color: '#14B8A6' }} />
                <div>
                  <h2>AI Funder Research</h2>
                  <p>Research potential funders and get strategic insights</p>
                </div>
              </div>
              <div className="example-buttons">
                <span className="example-label">Load Sample:</span>
                {exampleData.funder.map((ex, i) => (
                  <button key={i} className="btn btn-outline btn-sm" onClick={() => loadExampleData('funder', i)}>{ex.label}</button>
                ))}
              </div>
              <div className="tool-form">
                <div className="form-group">
                  <label>Funder Name to Research *</label>
                  <input type="text" value={funderForm.funder_name} onChange={(e) => setFunderForm({ ...funderForm, funder_name: e.target.value })} placeholder="e.g., Ford Foundation, Bill & Melinda Gates Foundation" />
                </div>
                <div className="form-group">
                  <label>Your Organization (for alignment analysis)</label>
                  <select value={funderForm.organization_id} onChange={(e) => setFunderForm({ ...funderForm, organization_id: e.target.value })}>
                    <option value="">Select Organization</option>
                    {organizations.map(org => (<option key={org.id} value={org.id}>{org.name}</option>))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Additional Context (Optional)</label>
                  <textarea value={funderForm.additional_info} onChange={(e) => setFunderForm({ ...funderForm, additional_info: e.target.value })} rows="2" placeholder="Any specific questions or context for the research..." />
                </div>
                <button className="btn generate-btn" style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)', color: 'white' }} onClick={handleFunder} disabled={loading}>
                  {loading ? <><FiRefreshCw className="spinning" /> Researching...</> : <><FiSearch /> Research Funder</>}
                </button>
              </div>
            </div>
          )}

          {/* AI Loading */}
          {loading && (
            <div className="ai-loading">
              <div className="ai-loading-content">
                <div className="spinner large"></div>
                <h3>AI is working on your request...</h3>
                <p>This may take a moment</p>
              </div>
            </div>
          )}

          {/* AI Result Display */}
          {aiResult && !loading && (
            <div className={`ai-output ${aiResult.type === 'error' ? 'error' : ''}`}>
              <div className="ai-output-header">
                <div className="ai-icon">
                  <FiCpu />
                </div>
                <div>
                  <h4>{aiResult.title}</h4>
                  {aiResult.meta && (
                    <div className="ai-output-meta">
                      {aiResult.meta.model && <span>Model: {aiResult.meta.model}</span>}
                      {aiResult.meta.tokens && <span>Tokens: {aiResult.meta.tokens}</span>}
                      {aiResult.meta.organization && <span>Org: {aiResult.meta.organization}</span>}
                      {aiResult.meta.grant && <span>Grant: {aiResult.meta.grant}</span>}
                      {aiResult.meta.grants_analyzed && <span>Grants: {aiResult.meta.grants_analyzed}</span>}
                      {aiResult.meta.deadlines_analyzed && <span>Deadlines: {aiResult.meta.deadlines_analyzed}</span>}
                    </div>
                  )}
                </div>
                <div className="ai-output-actions">
                  <button className="btn btn-secondary" onClick={copyToClipboard} title="Copy to clipboard">
                    <FiCopy /> Copy
                  </button>
                  <button className="btn btn-secondary" onClick={downloadAsText} title="Download as text file">
                    <FiDownload /> Download
                  </button>
                  {aiResult.meta?.savedId && (
                    <span className="saved-indicator"><FiCheck /> Saved</span>
                  )}
                  {aiResult.type === 'proposal' && aiResult.meta?.savedId && (
                    <button className="btn btn-primary" onClick={() => navigate('/proposals')} title="View in Proposals">
                      <FiExternalLink /> View in Proposals
                    </button>
                  )}
                </div>
              </div>
              <div className="ai-output-content">
                <ReactMarkdown>{aiResult.content}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AITools;
