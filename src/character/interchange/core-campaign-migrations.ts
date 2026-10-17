import { newCoreCampaignArchive, parseCoreCampaignArchive, type CoreCampaignArchive } from '../workflows/core-campaign-runtime';
import { parseCoreAdmissionArchive, type CoreAdmissionArchive } from '../workflows/core-admission';

/**
 * Explicit import boundary for the player-side campaign file.
 *
 * A file is either a supported campaign archive (validated and replayed), or
 * the one known deterministic predecessor: an admitted level-one creation
 * archive. No missing XP, equipment, dates, rulings or DM-only facts are
 * inferred here.
 */
export type CoreCampaignMigration = {
  archive: CoreCampaignArchive;
  migrated: boolean;
  from: { format: string; schemaVersion: number | string };
  to: { format: CoreCampaignArchive['format']; schemaVersion: CoreCampaignArchive['schemaVersion'] };
  warnings: string[];
};

type Envelope = { format?: unknown; schemaVersion?: unknown };

function envelope(value: unknown): Envelope {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('角色档案必须是 JSON 对象。');
  }
  return value as Envelope;
}
function version(value: unknown): number | string {
  return typeof value === 'number' || typeof value === 'string' ? value : 'unknown';
}

export function migrateCoreCampaignImport(value: unknown): CoreCampaignMigration {
  const raw = envelope(value);
  const from = { format: typeof raw.format === 'string' ? raw.format : 'unknown', schemaVersion: version(raw.schemaVersion) };

  if (raw.format === 'adnd1e-core-campaign-runtime' && raw.schemaVersion === 1) {
    let archive: CoreCampaignArchive;
    try { archive = parseCoreCampaignArchive(value); }
    catch { throw new Error(`战役档案 ${from.format} / ${String(from.schemaVersion)} 无法验证；原文件未覆盖。`); }
    return { archive, migrated: false, from, to: { format: archive.format, schemaVersion: archive.schemaVersion }, warnings: [] };
  }

  if (raw.format === 'adnd1e-core-admission-runtime' && raw.schemaVersion === 1) {
    let admission: CoreAdmissionArchive;
    try { admission = parseCoreAdmissionArchive(value as CoreAdmissionArchive); }
    catch { throw new Error(`准入档案 ${from.format} / ${String(from.schemaVersion)} 无法验证；原文件未覆盖。`); }
    const archive = newCoreCampaignArchive(admission);
    return {
      archive,
      migrated: true,
      from,
      to: { format: archive.format, schemaVersion: archive.schemaVersion },
      warnings: [
        '已将一级准入档案转换为战役运营档案；没有生成新的经验、当前 HP、装备穿戴、日历或后续裁定。',
        '转换后的首个运营事件仍须按实际团桌记录；原准入档案应继续作为独立备份。',
      ],
    };
  }

  throw new Error(`不支持的角色档案版本：${from.format} / ${String(from.schemaVersion)}。原文件未覆盖。`);
}
