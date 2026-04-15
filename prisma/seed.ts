import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Serialize JSON columns stored as text (SQLite). */
const j = (value: unknown) => JSON.stringify(value);

/** Optional real addresses for demo (set in `.env`); safe fallbacks for CI/local without .env */
function envEmail(key: string, fallback: string): string {
  const v = process.env[key];
  return v && String(v).trim() ? String(v).trim() : fallback;
}

/** E.164 phone for SMS/WhatsApp demo (Twilio sandbox); safe fake fallback when unset */
function envPhone(key: string, fallback: string): string {
  const v = process.env[key];
  return v && String(v).trim() ? String(v).trim() : fallback;
}

async function main() {
  // === Clear all tables (order matters for FK constraints) ===
  await prisma.meeting.deleteMany();
  await prisma.connectedEmail.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.candidateJob.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.job.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.smsNumber.deleteMany();  // NEW — clear SMS numbers

  const now = new Date();

  // ============================================================
  // SMS NUMBER CONFIGURATION
  // For dev/demo: all 3 use the same trial number from .env
  // When Twilio upgrade completes, set distinct numbers in .env
  // ============================================================
  const smsPhoneDefault = process.env.TWILIO_PHONE_NUMBER || '+15551234567';
  const smsPhoneRecruiter = process.env.TWILIO_NUMBER_RECRUITER || smsPhoneDefault;
  const smsPhoneHiringLead = process.env.TWILIO_NUMBER_HIRING_LEAD || smsPhoneDefault;
  const smsPhoneShared = process.env.TWILIO_NUMBER_SHARED || smsPhoneDefault;

  console.log('Seeding SMS numbers...');
  const smsNumberRecruiter = await prisma.smsNumber.create({
    data: {
      phone_number: smsPhoneRecruiter,
      display_label: "Atharva's Line",
      number_type: 'dedicated',
      assigned_to_id: 'emp-rec-001',
      assigned_to_name: 'Atharva M',
      is_active: true,
    },
  });
  console.log(`  ✓ Recruiter: ${smsNumberRecruiter.phone_number} → ${smsNumberRecruiter.assigned_to_name}`);

  const smsNumberHiringLead = await prisma.smsNumber.create({
    data: {
      phone_number: smsPhoneHiringLead,
      display_label: "Hiring Lead Line",
      number_type: 'dedicated',
      assigned_to_id: 'emp-hl-001',
      assigned_to_name: 'Hiring Lead',
      is_active: true,
    },
  });
  console.log(`  ✓ Hiring Lead: ${smsNumberHiringLead.phone_number} → ${smsNumberHiringLead.assigned_to_name}`);

  const smsNumberShared = await prisma.smsNumber.create({
    data: {
      phone_number: smsPhoneShared,
      display_label: 'Recruiting Team',
      number_type: 'shared',
      assigned_to_id: null,
      assigned_to_name: null,
      is_active: true,
    },
  });
  console.log(`  ✓ Shared: ${smsNumberShared.phone_number} → Recruiting Team`);

  // ============================================================
  // EMAIL TEMPLATES (unchanged)
  // ============================================================
  const templates = await prisma.emailTemplate.createMany({
    data: [
      {
        name: "Application Received — Confirmation",
        category: "confirmation",
        subject_template: "We received your application — {{job_title}}",
        body_template:
          "Hi {{candidate_name}},\n\nThank you for applying for {{job_title}}. We will review your profile and get back to you shortly.\n\n— {{recruiter_name}}",
        variables: j(["candidate_name", "job_title", "recruiter_name", "company_name"]),
        channel: "email",
      },
      {
        name: "Application Update — Not Moving Forward",
        category: "rejection",
        subject_template: "Update on your application — {{job_title}}",
        body_template:
          "Hi {{candidate_name}},\n\nThank you for your interest. We will not be moving forward at this time.\n\nBest,\n{{recruiter_name}}",
        variables: j(["candidate_name", "job_title", "recruiter_name"]),
        channel: "email",
      },
      {
        name: "Interview Scheduling",
        category: "scheduling",
        subject_template: "Interview invitation — {{job_title}}",
        body_template:
          "Hi {{candidate_name}},\n\nWe would like to schedule an interview for {{job_title}} on {{interview_date}}.\n\n— {{recruiter_name}}",
        variables: j(["candidate_name", "job_title", "interview_date", "recruiter_name"]),
        channel: "email",
      },
      {
        name: "Offer Letter",
        category: "offer",
        subject_template: "Offer — {{job_title}} at {{company_name}}",
        body_template:
          "Hi {{candidate_name}},\n\nWe are pleased to extend an offer for {{job_title}}.\n\n— {{recruiter_name}}",
        variables: j(["candidate_name", "job_title", "company_name", "recruiter_name"]),
        channel: "email",
      },
      {
        name: "Follow-up — Next Steps",
        category: "follow_up",
        subject_template: "Following up — {{job_title}}",
        body_template:
          "Hi {{candidate_name}},\n\nI wanted to follow up on our last conversation regarding {{job_title}}.\n\n— {{recruiter_name}}",
        variables: j(["candidate_name", "job_title", "recruiter_name"]),
        channel: "email",
      },
      {
        name: "Assessment Invitation",
        category: "assessment_invite",
        subject_template: "Complete your assessment — {{job_title}}",
        body_template:
          "Hi {{candidate_name}},\n\nPlease complete the online assessment for {{job_title}}.\n\n— {{recruiter_name}}",
        variables: j(["candidate_name", "job_title", "recruiter_name"]),
        channel: "email",
      },
      {
        name: "Pre-Offer Checklist",
        category: "pre_offer",
        subject_template: "Pre-offer steps — {{job_title}}",
        body_template:
          "Hi {{candidate_name}},\n\nBefore we finalize your offer for {{job_title}}, please complete the pending items.\n\n— {{recruiter_name}}",
        variables: j(["candidate_name", "job_title", "recruiter_name"]),
        channel: "email",
      },
      {
        name: "Custom Recruiter Message",
        category: "custom",
        subject_template: "{{subject_line}}",
        body_template: "Hi {{candidate_name}},\n\n{{body}}\n\n— {{recruiter_name}}",
        variables: j(["candidate_name", "subject_line", "body", "recruiter_name"]),
        channel: "email",
      },
    ],
  });
  if (templates.count !== 8) {
    throw new Error(`Expected 8 email templates, got ${templates.count}`);
  }

  const tplRows = await prisma.emailTemplate.findMany({ orderBy: { name: "asc" } });
  const tplByName = Object.fromEntries(tplRows.map((t) => [t.name, t])) as Record<
    string,
    (typeof tplRows)[0]
  >;

  // ============================================================
  // JOBS (unchanged)
  // ============================================================
  const jobs = await prisma.$transaction([
    prisma.job.create({
      data: {
        title: "Regional Sales Manager",
        department: "Sales",
        location: "Mumbai",
        status: "open",
        job_code: "RSM-2024-0142",
        requisition_id: "REQ-77821",
        hiring_lead_id: "emp-hl-001",
        recruiter_ids: j(["emp-rec-001", "emp-rec-002"]),
        hiring_workflow_template_id: "wf-standard-01",
      },
    }),
    prisma.job.create({
      data: {
        title: "Product Manager",
        department: "Product",
        location: "Bengaluru",
        status: "open",
        job_code: "PM-2024-0881",
        requisition_id: "REQ-88102",
        hiring_lead_id: "emp-hl-002",
        recruiter_ids: j(["emp-rec-001"]),
        hiring_workflow_template_id: "wf-standard-01",
      },
    }),
    prisma.job.create({
      data: {
        title: "Software Engineer",
        department: "Engineering",
        location: "Hyderabad",
        status: "open",
        job_code: "SE-2024-2204",
        requisition_id: "REQ-90234",
        hiring_lead_id: "emp-hl-001",
        recruiter_ids: j(["emp-rec-002", "emp-rec-003"]),
        hiring_workflow_template_id: "wf-tech-02",
      },
    }),
    prisma.job.create({
      data: {
        title: "HR Business Partner",
        department: "Human Resources",
        location: "Gurugram",
        status: "on_hold",
        job_code: "HRBP-2024-0501",
        requisition_id: "REQ-66100",
        hiring_lead_id: "emp-hl-003",
        recruiter_ids: j(["emp-rec-003"]),
        hiring_workflow_template_id: "wf-standard-01",
      },
    }),
  ]);

  const [jobRsm, jobPm, jobSe, jobHrbp] = jobs;

  /** Task 21: set in `.env` for live demo — Priya, Arjun, Sneha respectively */
  const demo1 = envEmail("SEED_DEMO_EMAIL_1", "demo.pm@example.com");
  const demo2 = envEmail("SEED_DEMO_EMAIL_2", "demo.colleague@example.com");
  const demo3 = envEmail("SEED_DEMO_EMAIL_3", "demo.candidate@example.com");
  /** Task 21: real numbers that joined Twilio WhatsApp sandbox — Priya & Arjun */
  const phoneDemo1 = envPhone("SEED_DEMO_PHONE_1", "+919876543210");
  const phoneDemo2 = envPhone("SEED_DEMO_PHONE_2", "+919650064864");

  type CDef = {
    name: string;
    email: string;
    phone: string;
    whatsapp_number: string;
    stage: string;
    source: string;
    recruiter_id: string;
    hiring_lead_id: string;
    sms_consent_status: string;        // NEW
    sms_consent_at: Date | null;       // NEW
    sms_opted_out_at: Date | null;     // NEW
    email_consent_status: string;
    email_unsubscribed_at: Date | null;
  };

  const candidateDefs: CDef[] = [
    {
      name: "Priya Sharma",
      email: demo1,
      phone: phoneDemo1,
      whatsapp_number: phoneDemo1,
      stage: "interview",
      source: "job_portal",
      recruiter_id: "emp-rec-001",
      hiring_lead_id: "emp-hl-001",
      sms_consent_status: "granted",
      sms_consent_at: new Date("2025-01-10"),
      sms_opted_out_at: null,
      email_consent_status: "granted",
      email_unsubscribed_at: null,
    },
    {
      name: "Arjun Mehta",
      email: demo2,
      phone: "+16476741670",
      whatsapp_number: "+16476741670",
      stage: "assessment",
      source: "referral",
      recruiter_id: "emp-rec-001",
      hiring_lead_id: "emp-hl-001",
      sms_consent_status: "granted",
      sms_consent_at: new Date("2025-01-12"),
      sms_opted_out_at: null,
      email_consent_status: "granted",
      email_unsubscribed_at: null,
    },
    {
      name: "Sneha Iyer",
      email: demo3,
      phone: "+919955566677",
      whatsapp_number: "+919955566677",
      stage: "screening",
      source: "IJP",
      recruiter_id: "emp-rec-002",
      hiring_lead_id: "emp-hl-002",
      sms_consent_status: "granted",
      sms_consent_at: new Date("2025-02-01"),
      sms_opted_out_at: null,
      email_consent_status: "granted",
      email_unsubscribed_at: null,
    },
    {
      name: "Vikram Singh",
      email: "vikram.singh.work@example.com",
      phone: "+919900011122",
      whatsapp_number: "+919900011122",
      stage: "offer",
      source: "external_recruiter",
      recruiter_id: "emp-rec-002",
      hiring_lead_id: "emp-hl-002",
      sms_consent_status: "granted",
      sms_consent_at: new Date("2025-01-20"),
      sms_opted_out_at: null,
      email_consent_status: "granted",
      email_unsubscribed_at: null,
    },
    {
      name: "Mayank Prabhakar",
      email: "mayank.prabhakar@darwinbox.in",
      phone: "+919741803810",
      whatsapp_number: "+919741803810",
      stage: "pre_offer",
      source: "job_portal",
      recruiter_id: "emp-rec-001",
      hiring_lead_id: "emp-hl-001",
      sms_consent_status: "granted",
      sms_consent_at: new Date("2025-01-18"),
      sms_opted_out_at: null,
      email_consent_status: "granted",
      email_unsubscribed_at: null,
    },
    {
      name: "Sarika Bikkani",
      email: "sarika.b@darwinbox.in",
      phone: "+917042254148",
      whatsapp_number: "+917042254148",
      stage: "applied",
      source: "CRM",
      recruiter_id: "emp-rec-003",
      hiring_lead_id: "emp-hl-003",
      sms_consent_status: "granted",     // PENDING — demo: consent not yet obtained
      sms_consent_at: null,
      sms_opted_out_at: null,
      email_consent_status: "granted",
      email_unsubscribed_at: null,
    },
    {
      name: "Kavya Katterapalli",
      email: "kavya.k@darwinbox.in",
      phone: "+919444523970",
      whatsapp_number: "+919444523970",
      stage: "shortlisting",
      source: "referral",
      recruiter_id: "emp-rec-001",
      hiring_lead_id: "emp-hl-001",
      sms_consent_status: "granted",
      sms_consent_at: new Date("2025-02-05"),
      sms_opted_out_at: null,
      email_consent_status: "granted",
      email_unsubscribed_at: null,
    },
    {
      name: "Rohit Khanna",
      email: "rohit.khanna.dev@example.com",
      phone: "+919922211100",
      whatsapp_number: "+919922211100",
      stage: "hired",
      source: "job_portal",
      recruiter_id: "emp-rec-002",
      hiring_lead_id: "emp-hl-001",
      sms_consent_status: "granted",
      sms_consent_at: new Date("2024-12-15"),
      sms_opted_out_at: null,
      email_consent_status: "granted",
      email_unsubscribed_at: null,
    },
    {
      name: "Meera Joshi",
      email: "meera.joshi.pm@example.com",
      phone: "+919911100022",
      whatsapp_number: "+919911100022",
      stage: "rejected",
      source: "job_portal",
      recruiter_id: "emp-rec-001",
      hiring_lead_id: "emp-hl-002",
      sms_consent_status: "revoked",     // REVOKED — demo: opted out
      sms_consent_at: new Date("2025-01-05"),
      sms_opted_out_at: new Date("2025-03-01"),
      email_consent_status: "revoked",
      email_unsubscribed_at: new Date("2025-03-05"),
    },
    {
      name: "Akshat Chopra",
      email: "akshat.c@darwinbox.in",
      phone: "+919650064864",
      whatsapp_number: "+919650064864",
      stage: "interview",
      source: "IJP",
      recruiter_id: "emp-rec-002",
      hiring_lead_id: "emp-hl-001",
      sms_consent_status: "granted",
      sms_consent_at: new Date("2025-02-10"),
      sms_opted_out_at: null,
      email_consent_status: "granted",
      email_unsubscribed_at: null,
    },
    {
      name: "Vinay Rao",
      email: "vinay.r@darwin.in",
      phone: "+919741803810",
      whatsapp_number: "+919741803810",
      stage: "shortlisting",
      source: "job_portal",
      recruiter_id: "emp-rec-003",
      hiring_lead_id: "emp-hl-003",
      sms_consent_status: "granted",
      sms_consent_at: new Date("2025-02-15"),
      sms_opted_out_at: null,
      email_consent_status: "granted",
      email_unsubscribed_at: null,
    },
    {
      name: "Suresh Menon",
      email: "suresh.menon.sales@example.com",
      phone: "+18594471304",
      whatsapp_number: "+919888899900",
      stage: "assessment",
      source: "referral",
      recruiter_id: "emp-rec-001",
      hiring_lead_id: "emp-hl-001",
      sms_consent_status: "granted",
      sms_consent_at: new Date("2025-01-25"),
      sms_opted_out_at: null,
      email_consent_status: "granted",
      email_unsubscribed_at: null,
    },
  ];

  const createdCandidates = await prisma.$transaction(
    candidateDefs.map((c) =>
      prisma.candidate.create({
        data: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          whatsapp_number: c.whatsapp_number,
          current_stage: c.stage,
          recruiter_id: c.recruiter_id,
          hiring_lead_id: c.hiring_lead_id,
          hiring_manager_id: "emp-hm-001",
          source: c.source,
          sms_consent_status: c.sms_consent_status,     // NEW
          sms_consent_at: c.sms_consent_at,             // NEW
          sms_opted_out_at: c.sms_opted_out_at,         // NEW
          email_consent_status: c.email_consent_status,
          email_unsubscribed_at: c.email_unsubscribed_at,
        },
      }),
    ),
  );

  const [
    cPriya,
    cArjun,
    cSneha,
    cVikram,
    cAnanya,
    cKaran,
    cDivya,
    cRohit,
    cMeera,
    cAditya,
    cNeha,
    cSuresh,
  ] = createdCandidates;

  await prisma.candidateJob.createMany({
    data: [
      { candidate_id: cPriya.id, job_id: jobRsm.id, is_current: true },
      { candidate_id: cArjun.id, job_id: jobPm.id, is_current: true },
      { candidate_id: cSneha.id, job_id: jobSe.id, is_current: true },
      { candidate_id: cVikram.id, job_id: jobPm.id, is_current: true },
      { candidate_id: cAnanya.id, job_id: jobRsm.id, is_current: true },
      { candidate_id: cKaran.id, job_id: jobHrbp.id, is_current: true },
      { candidate_id: cDivya.id, job_id: jobSe.id, is_current: true },
      { candidate_id: cRohit.id, job_id: jobSe.id, is_current: true },
      { candidate_id: cMeera.id, job_id: jobPm.id, is_current: true },
      { candidate_id: cAditya.id, job_id: jobSe.id, is_current: true },
      { candidate_id: cNeha.id, job_id: jobHrbp.id, is_current: true },
      { candidate_id: cSuresh.id, job_id: jobRsm.id, is_current: true },
      // Second-job links for "Other Jobs" demos
      { candidate_id: cPriya.id, job_id: jobPm.id, is_current: false },
      { candidate_id: cArjun.id, job_id: jobSe.id, is_current: false },
      { candidate_id: cAnanya.id, job_id: jobPm.id, is_current: false },
    ],
  });

  const atharva = "Atharva M";
  const recruiterName = atharva;

  // ============================================================
  // COMMUNICATIONS
  // ============================================================
  type CommIn = {
    candidateId: string;
    jobId: string;
    channel: string;
    direction: string;
    sender_type: string;
    sender_id?: string;
    sender_name?: string;
    thread_id?: string;
    from_address?: string;
    to_address?: string;
    cc_addresses?: string[];
    subject?: string;
    body: string;
    template_id?: string;
    delivery_status: string;
    vendor_message_id?: string;
    sent_at: Date;
    read_at?: Date | null;
    sms_number_id?: string;   // NEW — link to SmsNumber
  };

  function comm(c: CommIn) {
    return {
      candidate_id: c.candidateId,
      job_id: c.jobId,
      channel: c.channel,
      direction: c.direction,
      sender_type: c.sender_type,
      sender_id: c.sender_id,
      sender_name: c.sender_name,
      thread_id: c.thread_id,
      from_address: c.from_address,
      to_address: c.to_address,
      cc_addresses: c.cc_addresses?.length ? j(c.cc_addresses) : undefined,
      subject: c.subject,
      body: c.body,
      template_id: c.template_id,
      delivery_status: c.delivery_status,
      vendor_message_id: c.vendor_message_id,
      sent_at: c.sent_at,
      read_at: c.read_at ?? undefined,
      sms_number_id: c.sms_number_id ?? undefined,  // NEW
    };
  }

  const d1 = (days: number) => new Date(now.getTime() - days * 86400000);
  const h1 = (hours: number) => new Date(now.getTime() - hours * 3600000);

  const thrRsmPriya = "thr-rsm-priya-contact";
  const thrPmArjun = "thr-pm-arjun-contact";
  const thrSeAditya = "thr-se-aditya-noreply";

  const communications: CommIn[] = [
    // --- Thread: Priya @ RSM — contact@, reply, follow-up (3) ---
    {
      candidateId: cPriya.id,
      jobId: jobRsm.id,
      channel: "email",
      direction: "outbound",
      sender_type: "recruiter",
      sender_id: "emp-rec-001",
      sender_name: recruiterName,
      thread_id: thrRsmPriya,
      from_address: "contact@darwinbox.in",
      to_address: cPriya.email,
      subject: "RSM role — quick question on your availability",
      body: "Hi Priya, following up on the Regional Sales Manager discussion. Could you share your availability next week for a short call?",
      delivery_status: "delivered",
      vendor_message_id: "re_01seed_rsm_priya_01",
      sent_at: d1(4),
      read_at: d1(4),
    },
    {
      candidateId: cPriya.id,
      jobId: jobRsm.id,
      channel: "email",
      direction: "inbound",
      sender_type: "candidate",
      sender_name: cPriya.name,
      thread_id: thrRsmPriya,
      from_address: cPriya.email,
      to_address: "contact@darwinbox.in",
      subject: "Re: RSM role — quick question on your availability",
      body: "Thanks Atharva — I'm free Tuesday 4–6 PM IST. Let me know if that works.",
      delivery_status: "delivered",
      vendor_message_id: "re_01seed_rsm_priya_02",
      sent_at: d1(3),
      read_at: d1(3),
    },
    {
      candidateId: cPriya.id,
      jobId: jobRsm.id,
      channel: "email",
      direction: "outbound",
      sender_type: "recruiter",
      sender_id: "emp-rec-001",
      sender_name: recruiterName,
      thread_id: thrRsmPriya,
      from_address: "contact@darwinbox.in",
      to_address: cPriya.email,
      subject: "Re: RSM role — quick question on your availability",
      body: "Tuesday 5 PM works — I'll send a calendar invite shortly.",
      delivery_status: "sent",
      vendor_message_id: "re_01seed_rsm_priya_03",
      sent_at: d1(2),
    },
    // Priya also on PM job (other job) — thread snippet
    {
      candidateId: cPriya.id,
      jobId: jobPm.id,
      channel: "email",
      direction: "outbound",
      sender_type: "system",
      sender_name: "System",
      subject: "Application received — Product Manager",
      body: "Your application for Product Manager has been received.",
      template_id: tplByName["Application Received — Confirmation"].id,
      delivery_status: "delivered",
      vendor_message_id: "re_01seed_pm_sys_01",
      sent_at: d1(10),
    },
    // --- Thread: Arjun @ PM ---
    {
      candidateId: cArjun.id,
      jobId: jobPm.id,
      channel: "email",
      direction: "outbound",
      sender_type: "recruiter",
      sender_id: "emp-rec-001",
      sender_name: recruiterName,
      thread_id: thrPmArjun,
      from_address: "contact@darwinbox.in",
      to_address: cArjun.email,
      cc_addresses: ["hiring.lead@darwinbox.in"],
      subject: "PM screening — take-home context",
      body: "Hi Arjun, sharing context for the take-home. Focus on prioritization under constraints.",
      delivery_status: "delivered",
      vendor_message_id: "re_01seed_pm_arjun_01",
      sent_at: d1(5),
    },
    {
      candidateId: cArjun.id,
      jobId: jobPm.id,
      channel: "email",
      direction: "inbound",
      sender_type: "candidate",
      sender_name: cArjun.name,
      thread_id: thrPmArjun,
      from_address: cArjun.email,
      to_address: "contact@darwinbox.in",
      subject: "Re: PM screening — take-home context",
      body: "Got it — I'll submit by EOD Friday. One question: expected length?",
      delivery_status: "delivered",
      vendor_message_id: "re_01seed_pm_arjun_02",
      sent_at: d1(4),
    },
    // --- Thread: Aditya @ SE — no-reply only ---
    {
      candidateId: cAditya.id,
      jobId: jobSe.id,
      channel: "email",
      direction: "outbound",
      sender_type: "system",
      sender_name: "System",
      thread_id: thrSeAditya,
      from_address: "no-reply@darwinbox.in",
      to_address: cAditya.email,
      subject: "Application acknowledgement",
      body: "We have received your application for Software Engineer.",
      delivery_status: "delivered",
      vendor_message_id: "re_01seed_se_noreply_01",
      sent_at: d1(8),
    },
    {
      candidateId: cAditya.id,
      jobId: jobSe.id,
      channel: "email",
      direction: "outbound",
      sender_type: "recruiter",
      sender_id: "emp-rec-002",
      sender_name: recruiterName,
      from_address: "contact@darwinbox.in",
      to_address: cAditya.email,
      subject: "Technical round — scheduling",
      body: "Hi Aditya, we'd like to schedule your technical discussion. Please suggest two slots.",
      delivery_status: "delivered",
      vendor_message_id: "re_01seed_se_aditya_contact_01",
      sent_at: d1(2),
    },
  ];

  // Bulk-add varied comms to reach 40+
  const extra: CommIn[] = [];

  const mkSystem = (
    cid: string,
    jid: string,
    subject: string,
    body: string,
    days: number,
    tpl?: string,
  ) =>
    extra.push({
      candidateId: cid,
      jobId: jid,
      channel: "email",
      direction: "outbound",
      sender_type: "system",
      sender_name: "System",
      from_address: "no-reply@darwinbox.in",
      to_address: createdCandidates.find((x) => x.id === cid)?.email,
      subject,
      body,
      template_id: tpl ? tplByName[tpl]?.id : undefined,
      delivery_status: "delivered",
      vendor_message_id: `re_mock_${cid.slice(0, 6)}_${extra.length}`,
      sent_at: d1(days),
    });

  // UPDATED: SMS helper now includes sms_number_id
  const mkSms = (cid: string, jid: string, body: string, days: number, st: string, smsNumId?: string) =>
    extra.push({
      candidateId: cid,
      jobId: jid,
      channel: "sms",
      direction: "outbound",
      sender_type: "recruiter",
      sender_name: recruiterName,
      sender_id: "emp-rec-001",
      from_address: smsPhoneRecruiter,
      to_address: createdCandidates.find((x) => x.id === cid)?.phone ?? undefined,
      body,
      delivery_status: st,
      vendor_message_id: st === "failed" ? undefined : `SM_mock_${extra.length}`,
      sent_at: d1(days),
      sms_number_id: smsNumId,   // NEW
    });

  const mkWa = (cid: string, jid: string, body: string, hours: number) =>
    extra.push({
      candidateId: cid,
      jobId: jid,
      channel: "whatsapp",
      direction: "outbound",
      sender_type: "recruiter",
      sender_name: recruiterName,
      body,
      delivery_status: "delivered",
      vendor_message_id: `WA_mock_${extra.length}`,
      sent_at: h1(hours),
    });

  const mkNotify = (cid: string, jid: string, body: string, days: number) =>
    extra.push({
      candidateId: cid,
      jobId: jid,
      channel: "system_notification",
      direction: "outbound",
      sender_type: "system",
      sender_name: "System",
      body,
      delivery_status: "delivered",
      sent_at: d1(days),
    });

  const mkCrm = (cid: string, jid: string, subject: string, body: string, days: number) =>
    extra.push({
      candidateId: cid,
      jobId: jid,
      channel: "email",
      direction: "outbound",
      sender_type: "CRM",
      sender_name: "CRM",
      subject,
      body,
      delivery_status: "delivered",
      sent_at: d1(days),
    });

  mkSystem(cSneha.id, jobSe.id, "We received your application", "Thank you for applying.", 12, "Application Received — Confirmation");
  mkSystem(cVikram.id, jobPm.id, "Interview invite", "Your interview is scheduled.", 6, "Interview Scheduling");
  mkSystem(cAnanya.id, jobRsm.id, "Assessment invite", "Please complete the sales assessment.", 3, "Assessment Invitation");
  mkSystem(cKaran.id, jobHrbp.id, "HRBP — application update", "We are reviewing your profile.", 9);
  mkSystem(cDivya.id, jobSe.id, "Coding round reminder", "Reminder: complete the coding exercise.", 2);
  mkSystem(cRohit.id, jobSe.id, "Offer paperwork", "Please upload documents.", 20, "Offer Letter");
  mkSystem(cMeera.id, jobPm.id, "Not moving forward", "Thank you for your interest.", 15, "Application Update — Not Moving Forward");

  // SMS messages now linked to sms_number_id
  mkSms(cPriya.id, jobRsm.id, "Hi Priya — confirming Tuesday 5 PM call.", 2, "delivered", smsNumberRecruiter.id);
  mkSms(cArjun.id, jobPm.id, "Reminder: take-home due tomorrow.", 1, "sent", smsNumberRecruiter.id);
  mkSms(cSneha.id, jobSe.id, "Your interview slot is confirmed.", 3, "failed", smsNumberHiringLead.id);

  mkWa(cPriya.id, jobRsm.id, "Hi Priya, following up on WhatsApp as discussed.", 30);
  mkWa(cVikram.id, jobPm.id, "Congratulations on clearing the panel — next steps on email.", 50);
  mkNotify(cAnanya.id, jobRsm.id, "Pipeline update: moved to Pre-Offer.", 1);
  mkNotify(cKaran.id, jobHrbp.id, "Your profile was shortlisted.", 4);
  mkCrm(cKaran.id, jobHrbp.id, "Sourced via CRM", "Candidate imported from CRM campaign.", 11);

  for (let i = 0; i < 8; i++) {
    mkSystem(
      cDivya.id,
      jobSe.id,
      `System notification ${i + 1}`,
      `Automated update #${i + 1} for your application.`,
      14 + i,
    );
  }

  for (let i = 0; i < 6; i++) {
    extra.push({
      candidateId: cNeha.id,
      jobId: jobHrbp.id,
      channel: "email",
      direction: "outbound",
      sender_type: "hiring_lead",
      sender_id: "emp-hl-003",
      sender_name: "Hiring Lead",
      from_address: "contact@darwinbox.in",
      to_address: cNeha.email,
      subject: `HRBP discussion ${i + 1}`,
      body: `Sharing notes from our sync #${i + 1}.`,
      delivery_status: i % 3 === 0 ? "delivered" : "sent",
      vendor_message_id: `re_hrbp_neha_${i}`,
      sent_at: d1(7 + i),
    });
  }

  for (let i = 0; i < 5; i++) {
    extra.push({
      candidateId: cSuresh.id,
      jobId: jobRsm.id,
      channel: "email",
      direction: "outbound",
      sender_type: "recruiter",
      sender_id: "emp-rec-001",
      sender_name: recruiterName,
      from_address: i % 2 === 0 ? "no-reply@darwinbox.in" : "contact@darwinbox.in",
      to_address: cSuresh.email,
      subject: `RSM outreach ${i + 1}`,
      body: `Quick update on the sales leadership role (${i + 1}).`,
      delivery_status: "delivered",
      vendor_message_id: `re_rsm_suresh_${i}`,
      sent_at: d1(i + 1),
    });
  }

  const pendingComm = {
    candidateId: cMeera.id,
    jobId: jobPm.id,
    channel: "email" as const,
    direction: "outbound" as const,
    sender_type: "recruiter" as const,
    sender_id: "emp-rec-001",
    sender_name: recruiterName,
    from_address: "contact@darwinbox.in",
    to_address: cMeera.email,
    subject: "Feedback request",
    body: "We would appreciate your feedback on the interview process.",
    delivery_status: "pending" as const,
    sent_at: h1(2),
  };

  const allComms = [...communications, ...extra, pendingComm];

  await prisma.$transaction(allComms.map((c) => prisma.communication.create({ data: comm(c) })));

  // ============================================================
  // MEETINGS (unchanged)
  // ============================================================
  const mtgCommScheduled = await prisma.communication.create({
    data: {
      candidate_id: cSneha.id,
      job_id: jobSe.id,
      channel: "meeting",
      direction: "outbound",
      sender_type: "recruiter",
      sender_id: "emp-rec-002",
      sender_name: recruiterName,
      subject: "1:1 — Engineering culture chat",
      body: "Informal 1:1 with the candidate to discuss team fit.",
      delivery_status: "sent",
      vendor_message_id: "re_mtg_sched_01",
      sent_at: h1(6),
    },
  });

  const mtgCommCompleted = await prisma.communication.create({
    data: {
      candidate_id: cVikram.id,
      job_id: jobPm.id,
      channel: "meeting",
      direction: "outbound",
      sender_type: "recruiter",
      sender_id: "emp-rec-001",
      sender_name: recruiterName,
      subject: "1:1 — Product vision alignment",
      body: "Completed discussion on roadmap expectations.",
      delivery_status: "delivered",
      vendor_message_id: "re_mtg_done_01",
      sent_at: d1(10),
    },
  });

  const mtgCommRescheduled = await prisma.communication.create({
    data: {
      candidate_id: cAnanya.id,
      job_id: jobRsm.id,
      channel: "meeting",
      direction: "outbound",
      sender_type: "recruiter",
      sender_id: "emp-rec-001",
      sender_name: recruiterName,
      subject: "1:1 — Sales leadership expectations",
      body: "Meeting was rescheduled per candidate request.",
      delivery_status: "sent",
      vendor_message_id: "re_mtg_rsch_01",
      sent_at: d1(1),
    },
  });

  await prisma.meeting.createMany({
    data: [
      {
        candidate_id: cSneha.id,
        job_id: jobSe.id,
        communication_id: mtgCommScheduled.id,
        title: "Engineering culture chat",
        description: "Informal 1:1 — 30 minutes",
        organizer_id: "emp-rec-002",
        participants: j([
          { name: recruiterName, email: "recruiter@darwinbox.in" },
          { name: cSneha.name, email: cSneha.email },
        ]),
        duration_minutes: 30,
        scheduled_at: new Date(now.getTime() + 2 * 86400000),
        channel: "google_meet",
        meeting_link: "https://meet.google.com/mock-seed-scheduled",
        status: "scheduled",
      },
      {
        candidate_id: cVikram.id,
        job_id: jobPm.id,
        communication_id: mtgCommCompleted.id,
        title: "Product vision alignment",
        description: "1:1 completed",
        organizer_id: "emp-rec-001",
        participants: j([
          { name: recruiterName, email: "recruiter@darwinbox.in" },
          { name: cVikram.name, email: cVikram.email },
        ]),
        duration_minutes: 45,
        scheduled_at: d1(10),
        channel: "ms_teams",
        meeting_link: "https://teams.microsoft.com/mock-completed",
        status: "completed",
      },
      {
        candidate_id: cAnanya.id,
        job_id: jobRsm.id,
        communication_id: mtgCommRescheduled.id,
        title: "Sales leadership expectations",
        description: "Rescheduled from prior week",
        organizer_id: "emp-rec-001",
        participants: j([
          { name: recruiterName, email: "recruiter@darwinbox.in" },
          { name: cAnanya.name, email: cAnanya.email },
        ]),
        duration_minutes: 60,
        scheduled_at: new Date(now.getTime() + 86400000),
        channel: "zoom",
        meeting_link: "https://zoom.us/j/mock-rescheduled",
        status: "rescheduled",
      },
    ],
  });

  const totalComms = await prisma.communication.count();
  if (totalComms < 40) {
    throw new Error(`Expected at least 40 communications, got ${totalComms}`);
  }

  console.log(
    JSON.stringify(
      {
        smsNumbers: await prisma.smsNumber.count(),  // NEW
        templates: await prisma.emailTemplate.count(),
        jobs: await prisma.job.count(),
        candidates: await prisma.candidate.count(),
        candidateJobLinks: await prisma.candidateJob.count(),
        communications: totalComms,
        meetings: await prisma.meeting.count(),
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });