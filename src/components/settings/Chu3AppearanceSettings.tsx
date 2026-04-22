import { useCallback, useEffect, useState } from "react";
import { Text } from "@cloudflare/kumo/components/text";
import * as gameApi from "../../api/game";
import { detailSet } from "../../api/settings";
import { getAppTexts } from "../../content/texts";
import { fmtNameErr } from "../../lib/censor";
import type { SettingFieldLocale } from "../../lib/settingsFieldLabels";
import { SegaUsernameEditor, normalizeSegaUsername } from "./SegaUsernameEditor";

export function Chu3AppearanceSettings({ locale }: { locale: SettingFieldLocale }) {
  const copy = getAppTexts(locale);
  const [userNameDraft, setUserNameDraft] = useState("");
  const [userNameSaved, setUserNameSaved] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setErr(null);
    try {
      const box = await gameApi.userBox();
      const u = (box.user ?? {}) as Record<string, unknown>;
      const un = typeof u.userName === "string" ? u.userName : "";
      setUserNameDraft(un);
      setUserNameSaved(un);
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.common.loadingFailed);
    }
  }, [copy.common.loadingFailed]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function saveField(field: string, value: string) {
    setSaving(field);
    setErr(null);
    setMsg(null);
    try {
      await detailSet("chu3", field, value);
      setMsg(copy.common.saved);
      await reload();
    } catch (e) {
      setErr(
        field === "userName"
          ? fmtNameErr(e, copy.chu3Appearance.renameAction)
          : e instanceof Error
            ? e.message
            : copy.common.failed,
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="mt-10 border-t border-kumo-line pt-8">
      <h3 className="text-kumo-default mb-2 text-base font-semibold">
        {copy.chu3Appearance.section}
      </h3>
      {err ? (
        <Text DANGEROUS_className="text-kumo-danger mb-2 text-sm">{err}</Text>
      ) : null}
      {msg ? (
        <Text DANGEROUS_className="text-kumo-success mb-2 text-sm">{msg}</Text>
      ) : null}

      <div className="mb-6 grid max-w-2xl gap-3">
        <SegaUsernameEditor
          label={copy.collectibles.fieldLabels.userName}
          locale={locale}
          value={userNameDraft}
          onChange={setUserNameDraft}
          saving={saving === "userName"}
          saveDisabled={userNameDraft === userNameSaved}
          onSave={() => void saveField("userName", normalizeSegaUsername(userNameDraft))}
        />
      </div>
    </section>
  );
}
