# Stay With Coffee Menu CMS

Supabase를 DB/Auth로 사용하는 정적 온라인 메뉴판 CMS입니다. 빌드 과정이 없어서 GitHub Pages, Netlify, Vercel 정적 배포에 바로 올릴 수 있습니다.

## 구성

- `menu.html`: 고객용 온라인 메뉴판
- `admin.html`: 메뉴 관리자 화면
- `assets/`: 공통 CSS/JS
- `supabase/schema.sql`: 테이블, RLS, 관리자 정책
- `supabase/seed.sql`: 현재 메뉴판 기반 초기 샘플 데이터
- `config.example.js`: Supabase 연결 설정 예시

## Supabase 설정

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/schema.sql`을 실행합니다.
3. Authentication > Users에서 관리자 계정을 생성합니다.
4. 생성된 사용자의 UUID를 확인한 뒤 SQL Editor에서 아래를 실행합니다.

```sql
insert into public.cms_admins (user_id)
values ('USER_UUID_HERE');
```

5. 필요하면 SQL Editor에서 `supabase/seed.sql`을 실행해 샘플 메뉴를 넣습니다.
6. Project Settings > API에서 Project URL과 anon public key를 복사합니다.
7. `config.example.js`를 `config.js`로 복사하고 값을 채웁니다.

```js
window.SWC_SUPABASE = {
  url: "https://YOUR_PROJECT_REF.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY"
};
```

`anonKey`는 공개 클라이언트 키입니다. 쓰기 권한은 RLS와 `cms_admins` 테이블로 막혀 있습니다.

## 로컬 확인

정적 파일이라 `menu.html`을 직접 열어도 되지만, 브라우저 모듈 로딩을 위해 로컬 서버 사용을 권장합니다.

```bash
python3 -m http.server 4173
```

그 다음 `http://localhost:4173/1.%20Projects/staywithcoffee-menu-cms/menu.html`로 접속합니다.

프로젝트 폴더 안에서 서버를 실행하면 더 짧습니다.

```bash
cd "1. Projects/staywithcoffee-menu-cms"
python3 -m http.server 4173
```

그 다음 `http://localhost:4173/menu.html`로 접속합니다.

## 배포

GitHub 저장소에 이 폴더를 올린 뒤 정적 호스팅을 연결하면 됩니다.

- GitHub Pages: 저장소 Settings > Pages에서 branch와 root를 선택
- Netlify/Vercel: build command 없이 publish directory를 이 프로젝트 폴더로 지정

`hooney.net/stary/` 같은 하위 경로 접근을 위해 `stary/index.html`과 `stary/admin.html`도 포함되어 있습니다. GitHub Pages 프로젝트 사이트의 기본 경로는 저장소명 기준이므로, `stay` 저장소만으로는 보통 `hooney.net/stay/`가 됩니다. `hooney.net/stary/`를 정확히 쓰려면 루트 도메인을 이 저장소에 연결하거나, 기존 루트 사이트에서 `/stary/` 경로를 이 배포물로 연결해야 합니다.

## 운영 메모

- 고객용 메뉴는 `is_active = true` 카테고리와 `is_published = true` 메뉴만 보여줍니다.
- 관리자 화면은 Supabase Auth 로그인 후 `cms_admins`에 등록된 사용자만 쓰기 작업이 가능합니다.
- 가격은 기존 메뉴판 표기 방식에 맞춰 천원 단위 숫자로 저장합니다. 예: `7.0`
