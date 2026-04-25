import { useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { cn } from "@cloudflare/kumo";
import { useKumoToastManager } from "@cloudflare/kumo";
import { Button, buttonVariants } from "@cloudflare/kumo/components/button";
import { Input } from "@cloudflare/kumo/components/input";
import { Link } from "@cloudflare/kumo/components/link";
import { Select } from "@cloudflare/kumo/components/select";
import { Text } from "@cloudflare/kumo/components/text";
import * as dataApi from "../../api/data";
import * as gameApi from "../../api/game";
import { getAppTexts } from "../../content/texts";
import { CHU3_MATCHINGS } from "../../lib/config";
import { downloadJsonFile } from "../../lib/download";
import type { SettingFieldLocale } from "../../lib/settingsFieldLabels";
import type { Chu3LxnsImportResult, ChusanMatchingOption, GameOption } from "../../lib/types";
import { Chu3AppearanceSettings } from "./Chu3AppearanceSettings";
import { ChusanLoginRewardSettings } from "./ChusanLoginRewardSettings";
import { GameOptionFields } from "./GameOptionFields";

export function ChusanExtraSettings({
  username,
  options,
  locale,
  onSet,
  onReload,
  err,
}: {
  username: string;
  options: GameOption[];
  locale: SettingFieldLocale;
  onSet: (key: string, value: string) => Promise<void>;
  onReload: () => Promise<void>;
  err: string | null;
}) {
  const copy = getAppTexts(locale);
  const toast = useKumoToastManager();
  const [linkedVerse, setLinkedVerse] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [custom, setCustom] = useState(false);
  const [symbolChat, setSymbolChat] = useState<
    Record<string, { name: string }>
  >({});
  const [symbols, setSymbols] = useState<Record<number, string>>({
    1: "",
    2: "",
    3: "",
    4: "",
  });
  const [symbolDirty, setSymbolDirty] = useState<Record<number, boolean>>({});
  const [symSaving, setSymSaving] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lxnsImporting, setLxnsImporting] = useState(false);
  const [lastFile, setLastFile] = useState("");
  const [lxnsToken, setLxnsToken] = useState("");
  const [lxnsFriendCode, setLxnsFriendCode] = useState("");
  const [lxnsResult, setLxnsResult] = useState<Chu3LxnsImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const basicOptions = useMemo(
    () => options.filter((o) => o.key !== "chusanTeamName"),
    [options],
  );

  const matchingUrl = String(
    options.find((o) => o.key === "chusanMatchingServer")?.value ?? "",
  );

  useEffect(() => {
    if (!username) return;
    void gameApi
      .userSummary(username, "chu3")
      .then((s) => {
        const parts = (s.lastVersion || "0.0.0").split(".");
        setLinkedVerse(parts[0] === "2" && parseInt(parts[1] || "0", 10) >= 40);
      })
      .catch(() => setLinkedVerse(false));
  }, [username]);

  useEffect(() => {
    if (matchingUrl && !CHU3_MATCHINGS.some((m) => m.matching === matchingUrl))
      setCustom(true);
    else if (CHU3_MATCHINGS.some((m) => m.matching === matchingUrl))
      setCustom(false);
  }, [matchingUrl]);

  useEffect(() => {
    void dataApi.allItems("chu3").then((raw: unknown) => {
      const o = raw as { symbolChat?: Record<string, { name: string }> };
      setSymbolChat(o?.symbolChat ?? {});
    });
  }, []);

  useEffect(() => {
    const next: Record<number, string> = { 1: "", 2: "", 3: "", 4: "" };
    for (const o of options) {
      const m = /^chusanSymbolChat(\d+)$/.exec(o.key);
      if (m && o.value != null && o.value !== "")
        next[parseInt(m[1], 10)] = String(o.value);
    }
    setSymbols(next);
    setSymbolDirty({});
  }, [options]);

  async function pickMatching(opt: ChusanMatchingOption) {
    await onSet("chusanMatchingReflector", opt.reflector);
    await onSet("chusanMatchingServer", opt.matching);
    setCustom(false);
    setOverlay(false);
    await onReload();
  }

  function clickCustom() {
    setCustom(true);
    setOverlay(false);
  }

  async function doExport() {
    setExporting(true);
    try {
      const data = await gameApi.exportGame("chu3");
      downloadJsonFile(`export-chu3-${username}.json`, data);
    } finally {
      setExporting(false);
    }
  }

  async function doImport(file: File) {
    setImporting(true);
    setLastFile(file.name);
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      await gameApi.importGame("chu3", json);
      toast.add({
        title: copy.chusanExtra.importSuccessTitle,
        description: copy.chusanExtra.importSuccessDesc,
      });
      await onReload();
    } catch (e) {
      toast.add({
        title: copy.chusanExtra.importFailedTitle,
        description:
          e instanceof Error
            ? e.message
            : copy.common.failed,
        variant: "error",
      });
    } finally {
      setImporting(false);
    }
  }

  async function doLxnsImport() {
    setLxnsImporting(true);
    try {
      const result = await gameApi.importChu3Lxns({
        lxnsToken: lxnsToken.trim(),
        friendCode: lxnsFriendCode.trim() || undefined,
        importRecent: true,
      });
      setLxnsResult(result);
      toast.add({
        title: copy.chusanExtra.lxnsImportSuccessTitle,
        description: copy.chusanExtra.lxnsImportSuccessDesc,
      });
      await onReload();
    } catch (e) {
      toast.add({
        title: copy.chusanExtra.importFailedTitle,
        description: e instanceof Error ? e.message : copy.common.failed,
        variant: "error",
      });
    } finally {
      setLxnsImporting(false);
    }
  }

  const symbolSelectOptions = useMemo(
    () =>
      Object.entries(symbolChat)
        .filter(([id]) => parseInt(id, 10) !== 0)
        .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10)),
    [symbolChat],
  );

  async function saveSymbol(slot: number) {
    const key = `chusanSymbolChat${slot}`;
    const raw = symbols[slot];
    setSymSaving(slot);
    try {
      await onSet(key, raw === "" ? "0" : raw);
      setSymbolDirty((d) => ({ ...d, [slot]: false }));
      await onReload();
    } finally {
      setSymSaving(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {err ? (
        <Text DANGEROUS_className="text-kumo-danger text-sm">{err}</Text>
      ) : null}

      <section>
        <h3 className="text-kumo-default mb-2 text-base font-semibold">
          {copy.chusanExtra.basics}
        </h3>
        <GameOptionFields
          options={basicOptions}
          gameFilter={(g) => g === "chu3"}
          locale={locale}
          onSet={onSet}
        />
      </section>

      <section>
        <h3 className="text-kumo-default mb-2 text-base font-semibold">
          {copy.chusanExtra.loginRewards}
        </h3>
        <ChusanLoginRewardSettings
          options={options}
          locale={locale}
          onSet={onSet}
          onReload={onReload}
        />
      </section>

      <section>
        <h3 className="text-kumo-default mb-2 text-base font-semibold">
          {copy.chusanExtra.team}
        </h3>
        <RouterLink
          to="/team"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          {copy.chusanExtra.openTeamPage}
        </RouterLink>
      </section>

      <section>
        <h3 className="text-kumo-default mb-2 text-base font-semibold">
          {copy.chusanExtra.matching}
        </h3>

        {linkedVerse ? (
          <>
            <GameOptionFields
              options={options}
              gameFilter={(g) => g === "chu3-linked-verse"}
              locale={locale}
              onSet={onSet}
            />
          </>
        ) : null}

        <div className="mt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOverlay(true)}
          >
            {copy.chusanExtra.choosePreset}
          </Button>
        </div>

        {custom ? (
          <div className="mt-4">
            <Text DANGEROUS_className="mb-2" size="sm">
              {copy.chusanExtra.customMatchingServer}
            </Text>
            <GameOptionFields
              options={options}
              gameFilter={(g) => g === "chu3-matching"}
              locale={locale}
              onSet={onSet}
            />
          </div>
        ) : null}
      </section>

      <section>
        <h3 className="text-kumo-default mb-2 text-base font-semibold">
          {copy.chusanExtra.symbolChat}
        </h3>
        {[1, 2, 3, 4].map((slot) => (
          <div key={slot} className="mb-4 flex max-w-xl flex-col gap-2">
            <span className="text-sm font-medium">
              {copy.chusanExtra.symbolChatSlot(slot)}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                className="min-w-[12rem]"
                aria-label={copy.chusanExtra.symbolChatSlot(slot)}
                value={symbols[slot] ?? ""}
                onValueChange={(v) => {
                  setSymbols((s) => ({ ...s, [slot]: String(v ?? "") }));
                  setSymbolDirty((d) => ({ ...d, [slot]: true }));
                }}
              >
                <Select.Option value="">
                  {copy.chusanExtra.defaultOption}
                </Select.Option>
                {symbolSelectOptions.map(([id, meta]) => (
                  <Select.Option key={id} value={id}>
                    {meta?.name ?? id}
                  </Select.Option>
                ))}
              </Select>
              {symbolDirty[slot] ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={symSaving === slot}
                  onClick={() => void saveSymbol(slot)}
                >
                  {copy.common.save}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </section>

      <Chu3AppearanceSettings locale={locale} />

      <div className="mt-2">
        <Link
          render={<RouterLink to="/collectibles" />}
          variant="inline"
          className="text-kumo-brand text-sm font-medium"
        >
          {copy.chusanExtra.openCollectibles}
        </Link>
      </div>

      <section>
        <h3 className="text-kumo-default mb-2 text-base font-semibold">
          {copy.chusanExtra.importExport}
        </h3>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void doImport(file);
            e.currentTarget.value = "";
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            disabled={importing}
            onClick={() => inputRef.current?.click()}
          >
            {importing ? copy.chusanExtra.importBusy : copy.chusanExtra.importSave}
          </Button>
          <Button
            variant="secondary"
            disabled={exporting}
            onClick={() => void doExport()}
          >
            {copy.chusanExtra.exportSave}
          </Button>
        </div>
        {lastFile ? (
          <Text DANGEROUS_className="text-kumo-subtle mt-2 block text-sm">
            {copy.chusanExtra.lastFile(lastFile)}
          </Text>
        ) : null}
      </section>

      <section>
        <h3 className="text-kumo-default mb-2 text-base font-semibold">
          {copy.chusanExtra.lxnsImport}
        </h3>
        <Text DANGEROUS_className="text-kumo-subtle mb-3 block text-sm">
          {copy.chusanExtra.lxnsImportHint}
        </Text>
        <div className="flex max-w-xl flex-col gap-3">
          <label className="flex flex-col gap-1">
            <Text size="sm">{copy.chusanExtra.lxnsToken}</Text>
            <Input
              type="password"
              value={lxnsToken}
              onChange={(e) => setLxnsToken(e.target.value)}
              placeholder="lxns token"
            />
          </label>
          <label className="flex flex-col gap-1">
            <Text size="sm">{copy.chusanExtra.lxnsFriendCode}</Text>
            <Input
              value={lxnsFriendCode}
              onChange={(e) => setLxnsFriendCode(e.target.value)}
              placeholder="123456789012345"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              disabled={lxnsImporting || !lxnsToken.trim()}
              onClick={() => void doLxnsImport()}
            >
              {lxnsImporting ? copy.chusanExtra.lxnsImportBusy : copy.chusanExtra.lxnsImportAction}
            </Button>
          </div>
        </div>
        {lxnsResult ? (
          <div className="border-kumo-line mt-4 rounded-xl border p-4">
            <Text DANGEROUS_className="mb-3 font-medium">
              {copy.chusanExtra.lxnsResult}
            </Text>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <Text>{copy.chusanExtra.lxnsPlayerName}: {lxnsResult.playerName || "—"}</Text>
              <Text>{copy.chusanExtra.lxnsFriendCodeUsed}: {lxnsResult.friendCodeUsed ?? "—"}</Text>
              <Text>{copy.chusanExtra.lxnsScoresFetched}: {lxnsResult.scoresFetched}</Text>
              <Text>{copy.chusanExtra.lxnsScoresInserted}: {lxnsResult.scoresInserted}</Text>
              <Text>{copy.chusanExtra.lxnsScoresUpdated}: {lxnsResult.scoresUpdated}</Text>
              <Text>{copy.chusanExtra.lxnsScoresUnchanged}: {lxnsResult.scoresUnchanged}</Text>
              <Text>{copy.chusanExtra.lxnsRecentsFetched}: {lxnsResult.recentsFetched}</Text>
              <Text>{copy.chusanExtra.lxnsRecentsInserted}: {lxnsResult.recentsInserted}</Text>
              <Text>{copy.chusanExtra.lxnsRecentsSkipped}: {lxnsResult.recentsSkipped}</Text>
              <Text>{copy.chusanExtra.lxnsCurrentRating}: {(lxnsResult.currentRating / 100).toFixed(2)}</Text>
              <Text>{copy.chusanExtra.lxnsHighestRating}: {(lxnsResult.highestRating / 100).toFixed(2)}</Text>
              <Text>{copy.chusanExtra.lxnsCreatedProfile}: {lxnsResult.createdLocalProfile ? copy.common.yes : copy.common.no}</Text>
            </div>
            {lxnsResult.warnings.length ? (
              <div className="mt-3">
                <Text DANGEROUS_className="mb-1 font-medium text-kumo-warning">
                  {copy.chusanExtra.lxnsWarnings}
                </Text>
                <div className="space-y-1">
                  {lxnsResult.warnings.map((one, idx) => (
                    <Text key={`${idx}-${one}`} DANGEROUS_className="text-kumo-subtle text-sm">
                      {one}
                    </Text>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {overlay ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={() => setOverlay(false)}
        >
          <div
            className="bg-kumo-base border-kumo-line max-h-[90vh] max-w-3xl overflow-auto rounded-lg border p-6 shadow-xl"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-kumo-default mb-2 text-lg font-semibold">
              {copy.chusanExtra.matchingDialogTitle}
            </h4>
            <div className="flex flex-wrap gap-3">
              {CHU3_MATCHINGS.map((opt) => {
                const preset = copy.chusanExtra.matchingPresets[opt.id as keyof typeof copy.chusanExtra.matchingPresets]
                return (
                <div
                  key={opt.matching}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "h-auto cursor-pointer flex-col items-stretch rounded-lg p-4 text-left",
                    !custom &&
                      matchingUrl === opt.matching &&
                      "ring-kumo-brand ring-2",
                  )}
                  onClick={() => void pickMatching(opt)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void pickMatching(opt);
                    }
                  }}
                >
                  <div className="font-semibold">{preset?.name ?? opt.id}</div>
                  <div className="text-kumo-brand mt-2 text-xs">
                    <Link
                      href={opt.ui}
                      target="_blank"
                      rel="noreferrer"
                      variant="inline"
                    >
                      {copy.chusanExtra.ui}
                    </Link>
                    {" · "}
                    <Link
                      href={opt.guide}
                      target="_blank"
                      rel="noreferrer"
                      variant="inline"
                    >
                      {copy.chusanExtra.guide}
                    </Link>
                  </div>
                  <div className="text-kumo-subtle mt-2 text-xs">
                    {(preset?.coop ?? []).join(" / ")}
                  </div>
                </div>
                )
              })}
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "h-auto cursor-pointer flex-col items-stretch rounded-lg p-4 text-left",
                  custom && "ring-kumo-brand ring-2",
                )}
                onClick={clickCustom}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    clickCustom();
                  }
                }}
              >
                <div className="font-semibold">
                  {copy.chusanExtra.custom}
                </div>
                <p className="text-kumo-subtle mt-1 text-xs">
                  {copy.chusanExtra.customHint}
                </p>
              </div>
            </div>
            <Button
              className="mt-6"
              variant="secondary"
              onClick={() => setOverlay(false)}
            >
              {copy.common.close}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
