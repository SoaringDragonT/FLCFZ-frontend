import { useCallback, useEffect, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { useLocation, useNavigate } from "react-router-dom";
import { navigateWithTransition } from "../utils/viewTransition";
import { readDemoPreset } from "../demoPreset";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  UserPlus,
} from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import Aurora from "../components/Aurora";
import CaptchaField from "../components/CaptchaField";
import { apiLogin, apiRegister } from "../services/mockApi";
import { isOfflineDemo } from "../services/http";
import { captchaImageSrc, fetchCaptcha, isDemoLoginName } from "../services/captcha";
import { adminDemo } from "../auth/demoCredentials";
import { saveDisplayName, saveSessionToken } from "../auth/session";
import { resolveEntryPath } from "../auth/entryPath";

type AuthTab = "login" | "register";
type Panel = "user" | "admin";

/* HashRouter 下查询参数在 hash 里（#/login?panel=admin），
   必须用 router 的 location.search 读取，window.location.search 取不到。 */
const readPanel = (search: string): Panel =>
  new URLSearchParams(search).get("panel") === "admin" ? "admin" : "user";

/* 登录页左侧的要点：与主页首屏同一套说法，保持两页观感一致。 */
const POINTS = [
  "三模态采集：文本、语音、图像",
  "持续记录：状态趋势与量表同步归档",
  "分级预警：高风险进入人工复核",
];

/* 卡片里重复出现的字段样式：集中一处，改版时不用四处对齐 */
const FIELD_LABEL = "mb-1.5 text-[13.5px] font-medium text-slate-700";
const FIELD_INPUT = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[14px] text-slate-800";

/* 注册时的密码强度：只按长度与字符种类打分，够用即可，不额外占版面。 */
function passwordStrength(value: string) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (score <= 1) return { label: "弱", color: "text-danger-600" };
  if (score <= 3) return { label: "中", color: "text-warning-600" };
  return { label: "强", color: "text-success-600" };
}

/* 独立登录页：主页左上角「登录」按钮跳到这里；主页右上角「管理员登录」带 ?panel=admin。
   整页锁定一屏高度（与主页首屏一致），不再上下滚动 —— 内容按登录态压到最短。 */
export default function LoginPage() {
  /* ==================== 一、页面状态 ==================== */
  const navigate = useNavigate();
  const { search } = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [tab, setTab] = useState<AuthTab>("login");
  const [panel, setPanel] = useState<Panel>(readPanel(search));
  const isAdmin = panel === "admin";
  const isRegister = !isAdmin && tab === "register";

  /* 演示包（手机版）会预填演示账号：手机上打两遍账号密码很烦，
     而演示现场常是"把手机递给别人看"。没有预设时初值仍是空串。 */
  const preset = readDemoPreset().prefill ?? {};
  const [username, setUsername] = useState(preset.username ?? "");
  const [password, setPassword] = useState(preset.password ?? "");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);

  /* ==================== 二、登录验证码 ==================== */
  /* 四位字母，服务端生成与校验；演示账号由服务端回传答案，这里自动填好。
     连不上后端（离线演示）时没有服务端可发，此时不拦登录。 */
  const [captchaId, setCaptchaId] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaError, setCaptchaError] = useState("");
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);

  /* 登录态与管理员口需要验证码；注册不需要 */
  const needCaptcha = isAdmin || tab === "login";
  const demoAccount = isDemoLoginName(username);

  const loadCaptcha = useCallback(async (account: string) => {
    setCaptchaLoading(true);
    setCaptchaError("");
    try {
      const payload = await fetchCaptcha(account);
      setCaptchaId(payload.id);
      setCaptchaSvg(payload.svg);
      setCaptchaCode(payload.demoCode ?? ""); // 演示账号自动填充，普通账号清空
      setCaptchaUnavailable(false);
    } catch {
      setCaptchaId("");
      setCaptchaSvg("");
      setCaptchaError("验证码加载失败，点击重试");
      setCaptchaUnavailable(true);
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  /* 换身份、换标签、账号在「演示↔普通」之间变化时换一张；
     普通账号之间改用户名不刷新，否则用户正抄着验证码就被换掉了。 */
  useEffect(() => {
    if (needCaptcha) void loadCaptcha(username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, tab, needCaptcha, demoAccount]);

  /* ==================== 三、表单动作 ==================== */
  const resetTips = () => {
    setMessage("");
    setError("");
  };

  const switchTab = (next: AuthTab) => {
    setTab(next);
    setShowPassword(false);
    resetTips();
  };

  const switchPanel = (next: Panel) => {
    setPanel(next);
    setTab("login");
    setShowPassword(false);
    resetTips();
    setUsername("");
    setPassword("");
    window.scrollTo({ top: 0 });
  };

  const fillDemo = () => {
    if (isAdmin) {
      setUsername(adminDemo.username);
      setPassword(adminDemo.password);
    } else {
      setUsername("xiaoyu");
      setPassword("123456");
    }
    resetTips();
  };

  const handleLogin = async () => {
    resetTips();
    /* 验证码：服务端不可用（离线演示）时不拦，交给 apiLogin 走本机演示数据 */
    if (needCaptcha && !captchaUnavailable) {
      if (!captchaId) return setError("验证码已失效，请点右侧「换一张」后重试");
      if (!captchaCode.trim()) return setError("请输入验证码");
    }
    setLoading(true);
    try {
      const result = await apiLogin(username, password, captchaId || undefined, captchaCode || undefined);
      if (!result.ok || !result.token) {
        setError(result.message || "登录失败");
        /* 验证码是一次性的：失败后必须换一张，否则再点还是同一张 */
        if (needCaptcha) void loadCaptcha(username);
        return;
      }
      saveSessionToken(result.token, rememberMe);
      saveDisplayName(result.name);
      /* 连不上后端时 apiLogin 会用本机演示数据完成登录（result.offline），
         这里如实说明进入离线演示，工作台顶栏也会挂「离线演示」标记。 */
      setMessage(result.offline ? "后端暂时连不上，已进入离线演示模式…" : "登录成功，正在进入系统…");
      /* 直接跳：个人账号首次登录先进欢迎页，判据是引导状态而不是有没有记录 */
      navigate(resolveEntryPath(result.role), { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    resetTips();
    if (password !== confirmPassword) return setError("两次输入的密码不一致");
    if (!name) return setError("请输入姓名");
    setLoading(true);
    try {
      const result = await apiRegister(username, password, name);
      if (!result.ok) return setError(result.message || "注册失败");
      setMessage(result.message || "注册成功，请使用新账号登录");
      setTab("login");
      setPassword("");
      setConfirmPassword("");
      setName("");
    } finally {
      setLoading(false);
    }
  };

  /* ==================== 四、视图 ==================== */
  return (
    <div className="page-enter auth-snap min-h-screen bg-page text-slate-800 lg:h-[100svh] lg:min-h-0 lg:overflow-hidden">
      {/* 顶栏：只留品牌与返回主页，与主页顶栏同高（4rem） */}
      <header className="nav-blur sticky top-0 z-40 px-6 sm:px-10 lg:px-12 xl:px-16">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo showSubtitle={false} />
            <span className="hidden whitespace-nowrap text-[15px] font-medium text-primary-600 sm:inline">
              健康管理平台
            </span>
            <span aria-hidden="true" className="hidden h-5 w-px bg-slate-300/80 sm:block" />
            <span className="whitespace-nowrap text-[15px] font-medium text-slate-700">登录</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigateWithTransition(navigate, "/")}
              className="group inline-flex items-center gap-1.5 px-2.5 py-2 text-sm font-medium text-slate-500 transition-colors duration-200 hover:text-primary-600"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span className="whitespace-nowrap">返回主页</span>
            </button>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-white/80 hover:text-primary-700 active:scale-90 active:bg-white"
              aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
              title={theme === "dark" ? "浅色模式" : "深色模式"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* 主体：桌面端锁定「一屏 - 顶栏」，与主页首屏等高；手机端照常纵向排布 */}
      <section
        id="login"
        className="auth-screen relative flex items-center overflow-hidden px-6 py-4 sm:px-10 sm:py-8 lg:h-[calc(100svh-4rem)] lg:px-12 lg:py-4 xl:px-16"
      >
        <Aurora variant="calm" />
        <div className="auth-login-grid relative z-10 mx-auto grid w-full items-center gap-10 lg:gap-12">
          {/* ---------- 左：平台简介（与主页首屏同一套文字层级；手机上隐藏，只留登录卡） ---------- */}
          <div className="relative z-10 hidden lg:block">
            <p className="text-[13px] font-semibold tracking-[0.2em] text-primary-500">关注状态 · 看见变化</p>
            <h2 className="auth-section-title mt-6 max-w-[720px] text-balance tracking-tight text-slate-900">
              从了解自己开始，照顾好每一天。
            </h2>
            <p className="intro-body mt-5 max-w-[34em] text-[15px] leading-7 text-slate-600 xl:text-[16px] xl:leading-8">
              连接筛查、记录与分析，让每一份关注都能得到回应；
              <br />
              登录后可查看筛查记录、状态趋势与评估报告。
            </p>
            <ul className="mt-7 grid gap-2 border-t border-dashed border-slate-200 pt-6">
              {POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2.5 text-[14px] leading-6 text-slate-600">
                  <Check className="h-4 w-4 shrink-0 text-success-600" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* ---------- 右：登录卡 ---------- */}
          <div className="relative z-10 w-full">
            <div className="mx-auto w-full max-w-[452px] rounded-2xl border border-slate-200 bg-white p-4 xl:max-w-[476px] shadow-[var(--card-shadow)] sm:p-5 lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto">
              {/* 卡片头 */}
              <div className="mb-3.5">
                <p className={`text-[12.5px] font-medium tracking-[0.16em] ${isAdmin ? "text-success-600" : "text-primary-500"}`}>
                  {isAdmin ? "STAFF ACCESS" : isRegister ? "CREATE ACCOUNT" : "WELCOME BACK"}
                </p>
                <h2 className="mt-2 text-[23px] font-semibold leading-tight text-slate-900">
                  {isAdmin ? "管理员登录" : isRegister ? "创建个人账号" : "欢迎回来"}
                </h2>
                <p className="mt-1.5 text-[13.5px] leading-5 text-slate-500">
                  {isAdmin
                    ? "咨询师与管理人员入口，用于预警研判、个案跟踪与数据维护。"
                    : isRegister
                      ? "建立属于您的健康档案，开始持续记录。"
                      : "登录后可查看筛查记录、状态趋势与评估报告。"}
                </p>
              </div>

              {/* 后端连不上时如实说明：当前是本机演示数据，不是服务器数据 */}
              {isOfflineDemo() && (
                <p className="mb-3 rounded-lg border border-warning-500/40 bg-warning-50 px-3 py-2 text-[12.5px] leading-5 text-warning-600">
                  后端暂时连不上，当前使用<strong className="font-semibold">离线演示数据</strong>
                  （只保存在这台设备）。用下方演示账号可直接进入。
                </p>
              )}

              {/* 身份切换：用户端「登录 / 注册」 */}
              {!isAdmin && (
                <div className="mb-3 flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="登录或注册">
                  {(["login", "register"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={tab === value}
                      onClick={() => switchTab(value)}
                      className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-all ${
                        tab === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {value === "login" ? "登录" : "注册"}
                    </button>
                  ))}
                </div>
              )}

              <form
                className="space-y-2.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!loading) void (isRegister ? handleRegister() : handleLogin());
                }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className={isRegister ? "block" : "col-span-2 block"}>
                    <span className={`${FIELD_LABEL} block`}>{isAdmin ? "管理员账号" : "用户名"}</span>
                    <input
                      id="username"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder={isAdmin ? "请输入管理员账号" : "请输入用户名"}
                      className={FIELD_INPUT}
                    />
                  </label>
                  {isRegister && (
                    <label className="block">
                      <span className={`${FIELD_LABEL} block`}>姓名</span>
                      <input
                        id="name"
                        autoComplete="name"
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="请输入姓名"
                        className={FIELD_INPUT}
                      />
                    </label>
                  )}
                  <label className={isRegister ? "block" : "col-span-2 block"}>
                    <span className={`${FIELD_LABEL} flex items-center justify-between`}>
                      密码
                      {isRegister && password && (
                        <span className={`text-[11.5px] font-normal ${strength.color}`}>{strength.label}</span>
                      )}
                    </span>
                    <span className="relative block">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={isRegister ? "new-password" : "current-password"}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="请输入密码"
                        className={`${FIELD_INPUT} pr-10`}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "隐藏密码" : "显示密码"}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-slate-500 transition-colors hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </span>
                  </label>
                  {isRegister && (
                    <label className="block">
                      <span className={`${FIELD_LABEL} block`}>确认密码</span>
                      <input
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="请再次输入密码"
                        className={FIELD_INPUT}
                      />
                    </label>
                  )}
                </div>

                {needCaptcha && (
                  <CaptchaField
                    imageSrc={captchaSvg ? captchaImageSrc(captchaSvg) : null}
                    code={captchaCode}
                    onCodeChange={setCaptchaCode}
                    onRefresh={() => void loadCaptcha(username)}
                    loading={captchaLoading}
                    error={captchaError}
                    autoFilled={demoAccount && !!captchaCode && !captchaError}
                  />
                )}

                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {isAdmin ? "在本机保持登录" : "记住我"}
                </label>

                {error && (
                  <p role="alert" className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-[12.5px] text-danger-600">
                    {error}
                  </p>
                )}
                {message && (
                  <p role="status" className="rounded-lg border border-success-100 bg-success-50 px-3 py-2 text-[12.5px] text-success-600">
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="ui-button ui-button-primary h-11 w-full rounded-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isAdmin ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : isRegister ? (
                    <UserPlus className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {loading ? "处理中…" : isAdmin ? "进入管理端" : isRegister ? "创建个人账号" : "登录并进入系统"}
                </button>
              </form>

              {/* 演示账号：整行点击即填充，与管理员入口上下分列、不并排 */}
              <button
                type="button"
                onClick={fillDemo}
                className="mt-2.5 flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] text-slate-500 transition-colors hover:border-primary-200 hover:text-slate-700"
              >
                <span>{isAdmin ? "管理端演示" : "演示账号"}</span>
                <code className="font-mono text-[13px] text-slate-800">
                  {isAdmin ? `${adminDemo.username} / ${adminDemo.password}` : "xiaoyu / 123456"}
                </code>
              </button>

              {/* 管理员入口：独立一行居中的文字按钮 */}
              <button
                type="button"
                onClick={() => switchPanel(isAdmin ? "user" : "admin")}
                aria-pressed={isAdmin}
                className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg py-1 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-primary-600"
              >
                <ShieldCheck className="h-4 w-4" />
                {isAdmin ? "返回用户登录" : "管理员 / 咨询师入口"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
