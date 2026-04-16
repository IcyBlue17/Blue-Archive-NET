import { useEffect, useState } from "react";
import { Text } from "@cloudflare/kumo/components/text";
import * as gameApi from "../../api/game";
import { detailSet } from "../../api/settings";
import { fmtNameErr1 } from "../../lib/censor";
import { CHU3_USERBOX_LABELS } from "../../lib/chu3Userbox";
import { SegaUsernameEditor, normalizeSegaUsername } from "./SegaUsernameEditor";

/** 仅游戏内名称；收藏品外观已迁移至 `/collectibles`。 */
export function Chu3AppearanceSettings() {
  const [userNameDraft, setUserNameDraft] = useState("");
  const [userNameSaved, setUserNameSaved] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function reload() {
    setErr(null);
    try {
      const box = await gameApi.userBox();
      const u = (box.user ?? {}) as Record<string, unknown>;
      const un = typeof u.userName === "string" ? u.userName : "";
      setUserNameDraft(un);
      setUserNameSaved(un);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载失败");
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function saveField(field: string, value: string) {
    setSaving(field);
    setErr(null);
    setMsg(null);
    try {
      await detailSet("chu3", field, value);
      setMsg("已保存");
      await reload();
    } catch (e) {
      setErr(
        field === "userName"
          ? fmtNameErr1(e, "改名")
          : e instanceof Error
            ? e.message
            : "保存失败",
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="mt-10 border-t border-kumo-border pt-8">
      <h3 className="text-kumo-text mb-2 text-base font-semibold">
        CHUNITHM 游戏内名称
      </h3>
      {err ? (
        <Text DANGEROUS_className="text-kumo-danger mb-2 text-sm">{err}</Text>
      ) : null}
      {msg ? (
        <Text DANGEROUS_className="text-kumo-success mb-2 text-sm">{msg}</Text>
      ) : null}

      <div className="mb-6 grid max-w-2xl gap-3">
        <SegaUsernameEditor
          label={CHU3_USERBOX_LABELS.userName}
          locale="zh"
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
