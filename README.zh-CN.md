# OpenCodex 令牌导入补丁

[English](README.md) | [한국어](README.ko.md) | [简体中文](README.zh-CN.md)

此仓库提供一个补丁和 Bun 启动脚本，为 [OpenCodex](https://github.com/lidge-jun/opencodex) 添加本地 JSON 账户导入功能。它不是 OpenCodex 的分叉，也不包含 OpenCodex 的完整源码。

打补丁后的 **添加 Codex 账户** 对话框支持：

- `Sub2API`
- `CPA`
- `Codex` / `auth.json`

选择格式后，可以上传 JSON 文件或粘贴其内容。粘贴的 JSON 会先在浏览器中检查结构；代理会进行最终凭据验证，且不会将令牌内容返回到 UI。

## 应用补丁

需要 Bun、Git 和已存在的 OpenCodex 安装。

```bash
bun scripts/patch.ts
```

启动脚本会先查找 OpenCodex 源码 checkout。若没有找到，它会检测全局 Bun 安装，在 `~/.opencodex/patched-source/` 创建用于补丁的源码工作目录并构建，然后将全局包链接切换到该工作目录。原全局包会以带日期的备份保留在相邻位置。

选项：

```bash
# 仅给指定源码 checkout 打补丁。
bun scripts/patch.ts --target=source /path/to/opencodex

# 强制使用全局 Bun 安装流程。
bun scripts/patch.ts --target=global

# 仅打补丁和构建，不重启 OpenCodex。
bun scripts/patch.ts --no-restart

# 只显示检测到的目标，不作任何修改。
bun scripts/patch.ts --print-source
```

如果需要固定源码发现路径，请设置 `OPENCODEX_SOURCE_DIR` 环境变量。

## 注意事项

- 必须提供 `access_token`。`refresh_token` 是可选的；缺失或被拒绝时，补丁仍会使用 access token 尝试经过认证的 Codex 检查。
- JSON 结构正确不代表凭据一定有效。服务器会先通过 OpenAI 验证，再将账户加入池中。
- 仅使用您有权操作的账户和凭据，并遵守 OpenAI 适用的条款和速率限制。

## 内容

- `patches/cpa-sub2-token-import.patch` — 应用于 OpenCodex 源码 checkout 的补丁
- `scripts/patch.ts` — 目标发现、打补丁、构建和重启脚本
