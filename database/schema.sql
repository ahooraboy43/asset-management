-- Hamrah Man v3 schema (MariaDB 10.5+ / MySQL 8+)
-- Run manually in a NEW database after backing up any existing database.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 email VARCHAR(190) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 display_name VARCHAR(120) NOT NULL DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS workspaces (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(160) NOT NULL,
 owner_user_id BIGINT UNSIGNED NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_workspace_owner FOREIGN KEY(owner_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS workspace_members (
 workspace_id BIGINT UNSIGNED NOT NULL,
 user_id BIGINT UNSIGNED NOT NULL,
 role ENUM('owner','admin','editor','viewer') NOT NULL DEFAULT 'viewer',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(workspace_id,user_id),
 CONSTRAINT fk_member_workspace FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
 CONSTRAINT fk_member_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS assets (
 id CHAR(36) PRIMARY KEY,
 workspace_id BIGINT UNSIGNED NOT NULL,
 name VARCHAR(160) NOT NULL,
 category VARCHAR(60) NOT NULL,
 model VARCHAR(120) NULL,
 build_year VARCHAR(10) NULL,
 plate VARCHAR(40) NULL,
 vin VARCHAR(100) NULL,
 current_metric DECIMAL(14,2) NULL,
 metric_unit VARCHAR(24) NULL,
 notes TEXT NULL,
 status ENUM('active','archived','sold') NOT NULL DEFAULT 'active',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_assets_workspace_status(workspace_id,status),
 CONSTRAINT fk_assets_workspace FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS operation_templates (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 workspace_id BIGINT UNSIGNED NULL,
 category VARCHAR(60) NOT NULL,
 name VARCHAR(160) NOT NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1,
 form_schema JSON NULL,
 is_active TINYINT(1) NOT NULL DEFAULT 1,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_templates_category(category,is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS operations (
 id CHAR(36) PRIMARY KEY,
 workspace_id BIGINT UNSIGNED NOT NULL,
 asset_id CHAR(36) NULL,
 template_id BIGINT UNSIGNED NULL,
 title VARCHAR(180) NOT NULL,
 trigger_type ENUM('date','metric','both','count') NOT NULL DEFAULT 'date',
 due_date DATE NULL,
 due_metric DECIMAL(14,2) NULL,
 metric_unit VARCHAR(24) NULL,
 interval_days INT UNSIGNED NULL,
 interval_metric DECIMAL(14,2) NULL,
 depends_on CHAR(36) NULL,
 status ENUM('open','done','cancelled') NOT NULL DEFAULT 'open',
 notes TEXT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_operations_due(workspace_id,status,due_date),
 CONSTRAINT fk_operations_workspace FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
 CONSTRAINT fk_operations_asset FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE SET NULL,
 CONSTRAINT fk_operations_template FOREIGN KEY(template_id) REFERENCES operation_templates(id) ON DELETE SET NULL,
 CONSTRAINT fk_operations_dependency FOREIGN KEY(depends_on) REFERENCES operations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS service_records (
 id CHAR(36) PRIMARY KEY,
 workspace_id BIGINT UNSIGNED NOT NULL,
 operation_id CHAR(36) NULL,
 asset_id CHAR(36) NULL,
 performed_at DATE NOT NULL,
 metric_value DECIMAL(14,2) NULL,
 part_name VARCHAR(180) NULL,
 cost_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
 currency CHAR(3) NOT NULL DEFAULT 'IRR',
 notes TEXT NULL,
 created_by BIGINT UNSIGNED NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_service_asset_date(asset_id,performed_at),
 CONSTRAINT fk_service_workspace FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
 CONSTRAINT fk_service_operation FOREIGN KEY(operation_id) REFERENCES operations(id) ON DELETE SET NULL,
 CONSTRAINT fk_service_asset FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE SET NULL,
 CONSTRAINT fk_service_user FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS attachments (
 id CHAR(36) PRIMARY KEY,
 workspace_id BIGINT UNSIGNED NOT NULL,
 service_record_id CHAR(36) NULL,
 original_name VARCHAR(255) NOT NULL,
 storage_key VARCHAR(255) NOT NULL,
 mime_type VARCHAR(120) NOT NULL,
 size_bytes BIGINT UNSIGNED NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_attachment_workspace FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
 CONSTRAINT fk_attachment_service FOREIGN KEY(service_record_id) REFERENCES service_records(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS audit_events (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 workspace_id BIGINT UNSIGNED NOT NULL,
 user_id BIGINT UNSIGNED NULL,
 entity_type VARCHAR(60) NOT NULL,
 entity_id VARCHAR(64) NOT NULL,
 action VARCHAR(60) NOT NULL,
 payload JSON NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_audit_entity(entity_type,entity_id),
 CONSTRAINT fk_audit_workspace FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
 CONSTRAINT fk_audit_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
