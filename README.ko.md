# OpenCodex 토큰 가져오기 패치

[English](README.md) | [한국어](README.ko.md) | [简体中文](README.zh-CN.md)

이 저장소는 [OpenCodex](https://github.com/lidge-jun/opencodex)에 로컬 JSON 계정 가져오기 기능을 추가하는 패치와 Bun 실행 스크립트를 제공합니다. OpenCodex 포크나 전체 소스 저장소가 아닙니다.

패치된 **Codex 계정 추가** 창은 다음 형식을 지원합니다.

- `Sub2API`
- `CPA`
- `Codex` / `auth.json`

형식을 선택한 뒤 JSON 파일을 업로드하거나 내용을 붙여넣을 수 있습니다. 붙여넣은 JSON은 브라우저에서 먼저 구조를 검사하며, 프록시는 토큰 원문을 UI에 반환하지 않고 최종 자격 증명 검증을 수행합니다.
<img width="618" height="606" alt="image" src="https://github.com/user-attachments/assets/65728b4f-f3d3-4293-8472-8ab341ed979a" />
<img width="651" height="422" alt="image" src="https://github.com/user-attachments/assets/adb57fc1-bd09-484e-b9de-1d00cd0f7a72" />
<img width="585" height="575" alt="image" src="https://github.com/user-attachments/assets/93513906-383b-4489-be1d-3cdfac5449d7" />

## 적용

Bun, Git, 그리고 기존 OpenCodex 설치가 필요합니다.

```bash
bun scripts/patch.ts
```

스크립트는 먼저 OpenCodex 소스 checkout을 찾습니다. 찾지 못하면 전역 Bun 설치를 감지하고 `~/.opencodex/patched-source/`에 패치용 소스 작업본을 만든 뒤 빌드합니다. 그 다음 전역 패키지 링크를 작업본으로 전환합니다. 기존 전역 패키지는 날짜가 포함된 백업으로 같은 위치에 보존됩니다.

옵션:

```bash
# 지정한 소스 checkout에만 적용합니다.
bun scripts/patch.ts --target=source /path/to/opencodex

# 전역 Bun 설치 방식으로 강제합니다.
bun scripts/patch.ts --target=global

# 패치와 빌드만 수행하고 OpenCodex 재시작은 직접 합니다.
bun scripts/patch.ts --no-restart

# 변경 없이 감지된 대상을 표시합니다.
bun scripts/patch.ts --print-source
```

소스 탐색 경로를 고정하려면 `OPENCODEX_SOURCE_DIR` 환경 변수를 설정하세요.

## 참고

- `access_token`은 필수입니다. `refresh_token`은 없어도 되며, 없거나 거절된 경우에도 access token으로 인증된 Codex 검증을 시도합니다.
- JSON 구조가 맞아도 실제 자격 증명이 유효하다는 뜻은 아닙니다. 계정 풀에 추가하기 전에 서버가 OpenAI를 통해 검증합니다.
- 사용할 권한이 있는 계정과 자격 증명만 사용하고, OpenAI의 적용 약관과 속도 제한을 준수하세요.

## 구성

- `patches/cpa-sub2-token-import.patch` — OpenCodex 소스 checkout에 적용하는 패치
- `scripts/patch.ts` — 대상 탐색, 패치, 빌드, 재시작 실행 스크립트
