-- CreateTable
CREATE TABLE "ConnectedEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "email_address" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expires_at" DATETIME,
    "scopes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" DATETIME,
    "sync_cursor" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Candidate" (
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
    "sms_opted_out_at" DATETIME,
    "email_consent_status" TEXT NOT NULL DEFAULT 'granted',
    "email_unsubscribed_at" DATETIME
);
INSERT INTO "new_Candidate" ("created_at", "current_stage", "email", "hiring_lead_id", "hiring_manager_id", "id", "name", "phone", "recruiter_id", "sms_consent_at", "sms_consent_status", "sms_opted_out_at", "source", "updated_at", "whatsapp_number") SELECT "created_at", "current_stage", "email", "hiring_lead_id", "hiring_manager_id", "id", "name", "phone", "recruiter_id", "sms_consent_at", "sms_consent_status", "sms_opted_out_at", "source", "updated_at", "whatsapp_number" FROM "Candidate";
DROP TABLE "Candidate";
ALTER TABLE "new_Candidate" RENAME TO "Candidate";
CREATE TABLE "new_Communication" (
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
    "connected_email_id" TEXT,
    CONSTRAINT "Communication_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Communication_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Communication_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "EmailTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Communication_sms_number_id_fkey" FOREIGN KEY ("sms_number_id") REFERENCES "SmsNumber" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Communication_connected_email_id_fkey" FOREIGN KEY ("connected_email_id") REFERENCES "ConnectedEmail" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Communication" ("body", "candidate_id", "cc_addresses", "channel", "delivery_status", "direction", "from_address", "id", "job_id", "read_at", "scheduled_for", "sender_id", "sender_name", "sender_type", "sent_at", "sms_number_id", "subject", "template_id", "thread_id", "to_address", "unmatched", "vendor_message_id") SELECT "body", "candidate_id", "cc_addresses", "channel", "delivery_status", "direction", "from_address", "id", "job_id", "read_at", "scheduled_for", "sender_id", "sender_name", "sender_type", "sent_at", "sms_number_id", "subject", "template_id", "thread_id", "to_address", "unmatched", "vendor_message_id" FROM "Communication";
DROP TABLE "Communication";
ALTER TABLE "new_Communication" RENAME TO "Communication";
CREATE INDEX "Communication_sms_number_id_idx" ON "Communication"("sms_number_id");
CREATE INDEX "Communication_connected_email_id_idx" ON "Communication"("connected_email_id");
CREATE INDEX "Communication_candidate_id_job_id_idx" ON "Communication"("candidate_id", "job_id");
CREATE INDEX "Communication_thread_id_idx" ON "Communication"("thread_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedEmail_user_id_key" ON "ConnectedEmail"("user_id");
