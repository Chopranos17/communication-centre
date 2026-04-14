-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp_number" TEXT,
    "current_stage" TEXT NOT NULL,
    "recruiter_id" TEXT,
    "hiring_lead_id" TEXT,
    "hiring_manager_id" TEXT,
    "source" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "sms_consent_status" TEXT NOT NULL DEFAULT 'pending',
    "sms_consent_at" DATETIME,
    "sms_opted_out_at" DATETIME
);

-- CreateTable
CREATE TABLE "CandidateJob" (
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("candidate_id", "job_id"),
    CONSTRAINT "CandidateJob_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CandidateJob_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "job_code" TEXT NOT NULL,
    "requisition_id" TEXT,
    "hiring_lead_id" TEXT,
    "recruiter_ids" TEXT,
    "hiring_workflow_template_id" TEXT
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidate_id" TEXT,
    "job_id" TEXT,
    "unmatched" BOOLEAN NOT NULL DEFAULT false,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "sender_type" TEXT NOT NULL,
    "sender_id" TEXT,
    "sender_name" TEXT,
    "thread_id" TEXT,
    "from_address" TEXT,
    "to_address" TEXT,
    "cc_addresses" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "template_id" TEXT,
    "delivery_status" TEXT NOT NULL DEFAULT 'pending',
    "vendor_message_id" TEXT,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_for" DATETIME,
    "read_at" DATETIME,
    "sms_number_id" TEXT,
    CONSTRAINT "Communication_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Communication_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Communication_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "EmailTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Communication_sms_number_id_fkey" FOREIGN KEY ("sms_number_id") REFERENCES "SmsNumber" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SmsNumber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone_number" TEXT NOT NULL,
    "twilio_phone_sid" TEXT,
    "display_label" TEXT,
    "number_type" TEXT NOT NULL DEFAULT 'dedicated',
    "assigned_to_id" TEXT,
    "assigned_to_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "communication_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "organizer_id" TEXT,
    "participants" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "scheduled_at" DATETIME NOT NULL,
    "channel" TEXT NOT NULL,
    "meeting_link" TEXT,
    "status" TEXT NOT NULL,
    CONSTRAINT "Meeting_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Meeting_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Meeting_communication_id_fkey" FOREIGN KEY ("communication_id") REFERENCES "Communication" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject_template" TEXT NOT NULL,
    "body_template" TEXT NOT NULL,
    "variables" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email'
);

-- CreateIndex
CREATE INDEX "CandidateJob_job_id_idx" ON "CandidateJob"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "Job_job_code_key" ON "Job"("job_code");

-- CreateIndex
CREATE INDEX "Communication_sms_number_id_idx" ON "Communication"("sms_number_id");

-- CreateIndex
CREATE INDEX "Communication_candidate_id_job_id_idx" ON "Communication"("candidate_id", "job_id");

-- CreateIndex
CREATE INDEX "Communication_thread_id_idx" ON "Communication"("thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "SmsNumber_phone_number_key" ON "SmsNumber"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "SmsNumber_twilio_phone_sid_key" ON "SmsNumber"("twilio_phone_sid");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_communication_id_key" ON "Meeting"("communication_id");
