export interface DirectoryUser {
  email: string;
  department: string | null;
  orgUnit: string | null;
}

export async function getDirectoryUsers(): Promise<DirectoryUser[]> {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const adminEmail = process.env.GOOGLE_ADMIN_EMAIL;
  if (!key || !adminEmail) throw new Error("Google Directory not configured");

  const { google } = await import("googleapis");

  const credentials = JSON.parse(key);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/admin.directory.user.readonly"],
    subject: adminEmail,
  });

  const admin = google.admin({ version: "directory_v1", auth });
  const res = await admin.users.list({
    customer: "my_customer",
    maxResults: 500,
    orderBy: "email",
    projection: "full",
    viewType: "admin_view",
  });

  const rawUsers = res.data.users ?? [];

  return rawUsers.map((u) => {
    const path = u.orgUnitPath ?? "/";
    const segments = path.split("/").filter(Boolean);

    // Strip leading number prefix: "02. 개발2팀" → "개발2팀"
    const clean = (s: string) => s.replace(/^\d+\.\s*/, "");

    // Build orgUnit as "부 > 팀" when both exist
    // e.g. "/04. R&D 사업본부/01. 개발사업부/02. 개발사업1부/02. 개발2팀"
    //   → segments[2]="개발사업1부", segments[3]="개발2팀" → "개발사업1부 > 개발2팀"
    // e.g. "/07. SI 2 사업본부/02. SI 2 기술지원2팀"
    //   → segments[1]="SI 2 기술지원2팀" (no 3rd level) → "SI 2 기술지원2팀"
    let orgUnit: string | null = null;
    if (segments.length >= 4) {
      // 사업본부/사업부/하부/팀 → show 부 + 팀
      const bu = clean(segments[2]);
      const team = clean(segments[segments.length - 1]);
      if (bu !== team) {
        orgUnit = `${bu} > ${team}`;
      } else {
        orgUnit = bu;
      }
    } else if (segments.length >= 3) {
      // 사업본부/사업부/팀 or 사업본부/하부/팀
      const mid = clean(segments[1]);
      const team = clean(segments[segments.length - 1]);
      if (mid !== team) {
        orgUnit = `${mid} > ${team}`;
      } else {
        orgUnit = mid;
      }
    } else if (segments.length >= 2) {
      orgUnit = clean(segments[segments.length - 1]);
    } else if (segments.length === 1) {
      orgUnit = clean(segments[0]);
    }

    // Skip generic/unassigned org units
    if (orgUnit === "그외모음" || orgUnit === "/") {
      orgUnit = null;
    }

    // Department = 사업본부 level (1st segment)
    let department: string | null = null;
    if (segments.length >= 1) {
      department = clean(segments[0]);
    }

    return {
      email: u.primaryEmail ?? "",
      department: department ?? u.organizations?.[0]?.department ?? null,
      orgUnit,
    };
  });
}
