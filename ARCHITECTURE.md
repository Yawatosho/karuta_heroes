# NDC KARUTA HEROES 開発ガイド

このリポジトリは、HTML / CSS / Vanilla JavaScriptだけで動作する、ビルド不要のブラウザゲームです。GitHub Pagesへそのまま配置できる構成を維持します。

実装を変更するときは、本書より実コードを正としてください。特にバランス値、演出時間、保存形式、アセットパスは既存値を変更しないことを原則とします。

## 実行時の不変条件

- 基準ステージは1366×768で、`mode_loader.js`が画面サイズに合わせて一様に縮小します。
- PC・スマートフォン横・スマートフォン縦は、同じDOMとゲーム状態をCSSクラスで表示し分けます。
- ゲーム本体は`window.karutaModes.cpu`を公開し、`mode_loader.js`だけがタイトルの固定ボタンから呼び出します。
- キャラクター／敵／難易度の静的設定は`window.karutaFightersConfig`を唯一の入口とします。
- BGM・SE・数字読み上げは`window.karutaAudio`を入口とし、HTML audio要素はフォールバックとして残します。
- `localStorage`のキー、バージョン、保存オブジェクトの形は互換性契約です。

## ファイルとディレクトリの責務

| パス | 責務 |
| --- | --- |
| `index.html` | 固定DOM、モーダル、フォールバック音声要素、GA4、OGP、スクリプト読込順 |
| `mode_loader.js` | 固定ステージの拡縮、端末クラス付与、基本メタ情報、タイトル固定ボタンと公開APIの接続 |
| `fighters_config.js` | プレイヤー、敵、難易度、2P操作、パッチノート、フォールバック札 |
| `fighters_game.js` | 保存、画面遷移、ストーリー、対戦、CPU、スキル、結果、エンディング、ギャラリー、デバッグ |
| `fighters_tuning.json` | 本番用のCPU反応、正答率、ダメージ、ゲージ、対戦台詞 |
| `audio_manager.js` | Web Audio API、HTML audioフォールバック、BGM、SE、数字VOICE、フェード、解析器 |
| `styles.css` | 固定ステージ、全画面、端末別表示、演出のスタイル |
| `ndc.json` | 同梱するNDC番号と分類名。リモート取得失敗時にも使う |
| `ending/ending.md` | キャラクター別エンディング本文 |
| `sw.js` | 音声キャッシュ用Service Worker |
| `character/` | 選択画面・対戦HUDのキャラクター素材 |
| `cutin/` | プレイヤー／敵の必殺技カットイン |
| `opening/` | 共通・キャラクター別オープニング素材 |
| `vs/`、`vs_tate/` | PC／スマートフォン縦のVS素材 |
| `round/` | ラウンド勝利素材 |
| `victory/`、`victory_tate/` | PC／スマートフォン縦の試合結果素材 |
| `ending/`、`ending_tate/` | PC／スマートフォン縦のエンディング素材 |
| `artwork/` | ストーリークリア報酬のアートワーク |
| `sound/` | BGM、SE、数字読み上げ、勝利音声 |
| `ignore/` | 公開・Git追跡対象外の資料、原本、開発支援ファイル |

## 現行コードの分類

### A. NDC KARUTA HEROESで現在使用

`fighters_game.js`のストーリー／対戦／ギャラリー、`fighters_config.js`、`fighters_tuning.json`、現在の全アセット、端末別CSS、GA4、Service Workerが該当します。削除対象ではありません。

### B. 旧カルタ由来だが現在も使用

`reader-panel`、3桁の`digit`、`cardGrid`、`message`、`resultModal`、HTML audio要素などの固定DOMが該当します。見た目上非表示の要素でも、JavaScriptの時刻・コンボ・HP更新先または音声フォールバックとして必要なものがあります。

### C. 旧ゲーム由来で現在未使用

今回、現在のCPU専用起動経路で常時非表示かつJavaScriptから参照されないことを確認した旧`waveDisplay`、`lifeDisplay`、`scoreDisplay` DOMを削除しました。

`styles.css`には旧モード向けの規則が残っています。カスケードや詳細度への影響を完全に否定できないため、今回は削除・並べ替えを行いません。

### D. デバッグ・開発支援

- `?debug=1`: 実ゲーム画面を使ったエンディング／勝利／敗北確認
- `?devTune=1`: ローカル調整値の読込を許可
- `window.karutaDevTuning`: チューニングツール向け公開窓口
- `ignore/local-dev/`: Git追跡外の調整ツール
- `console.warn`の取得失敗ログ: 本番フォールバックの診断用

本番タイトルから到達しないことだけを理由に削除しません。

## 読み込み順と公開API

`defer`スクリプトはHTML上の順序で実行されます。

1. `audio_manager.js`
   - `window.karutaAudio`を公開
   - `load`後に`sw.js`を登録
2. `fighters_config.js`
   - `window.karutaFightersConfig`を公開
3. `mode_loader.js`
   - 端末／ステージを初期化
   - `fighters_game.js`を動的に読み込む
4. `fighters_game.js`
   - configを読み取り、`window.karutaModes.cpu`と`window.karutaDevTuning`を公開
5. `mode_loader.js`
   - `refreshLanding()`でタイトルまたはデバッグ画面を描画

`window.karutaModes.cpu`の公開メソッドは次のとおりです。

- `startGame`
- `showGallery`
- `showPatchNotes`
- `showHowTo`
- `quitGame`
- `resetGame`
- `postToX`
- `refreshLanding`

名称は`mode_loader.js`との契約なので変更しません。

## fighters_game.jsの内部構造

単一IIFEのクロージャ内に状態を閉じ込めています。ファイル分割で共有状態や読込順を複雑化させないため、責務はセクションと小さな共通関数で分離します。

1. Configuration and static data
2. DOM references
3. Runtime state
4. Utilities
5. Save and progress persistence
6. Battle mode helpers and 2P input mapping
7. Ending story data
8. Production and local development tuning data
9. Audio facade
10. DOM overlays and visual effects
11. Screen rendering and UI lifecycle
12. Battle setup and round initialization
13. Turn timing, countdown and number reading
14. Card input and answer resolution
15. Damage, gauge, combo and battle HUD
16. Player skills and field-card effects
17. Enemy skills and CPU behavior
18. Round and match outcome calculation
19. Result presentation, next action and reset
20. Event binding and public API

## Runtime state

状態はライブラリや大規模なStateクラスへ移さず、用途別にまとまったクロージャ変数として管理します。

| 状態群 | 主な変数 | 所有する処理 |
| --- | --- | --- |
| 画面／モード | `screen`、`playMode`、`twoPlayerControls` | 各`render*Screen()`、`set*Controls()` |
| ストーリー選択 | `selectedPlayer`、`selectedDifficulty`、`stageIndex`、`currentEnemy` | キャラクター選択、CONTINUE、VS |
| デバッグ | `debug*`、`debugScreenLaunchActive` | `renderDebugScreen()` |
| 札／ターン | `allCardPool`、`cards`、`roundDeck`、`currentReadingCard`、`roundId` | 札取得、配札、読み上げ |
| 試合 | `battleRound`、ラウンド勝数、HP、ゲージ、コンボ | 対戦開始、回答、結果 |
| スキル | reveal、skip、power rush、reverse reading等 | プレイヤー／敵スキル |
| タイマー | round、countdown、cut-in、CPU、screen transition | 各clear関数 |
| ギャラリー | `galleryProgress`、equalizer状態 | 解放、閲覧、SOUND TEST |
| チュートリアル | `tutorial*`、skill toast | 初回導線、HELPからの再実行 |

`gameRunId`は非同期の札取得やチュートリアルが、終了済みのゲームへ戻って書き込まないための世代トークンです。

## 画面とストーリーフロー

通常のSTORY MODEは次の順で進みます。

```text
TITLE
  -> CHARACTER SELECT
  -> OPENING
  -> VS
  -> BATTLE
       -> ROUND WIN -> NEXT ROUND
       -> RESULT
            -> NEXT BATTLE -> VS
            -> GAME CLEAR -> ENDING -> CREDIT
                              -> ARTWORK UNLOCK（未解放がある場合）
                              -> TITLE
```

- 画面本体は必要時に`fighterStory`へ生成します。
- `setTitleControls()`、`setFlowControls()`、`setPlayingControls()`、`setResultControls()`がbodyクラスと固定UIの表示を統一します。
- bodyクラスの全解除は`setBodyScreenState()`、主要ボタン非表示は`hidePrimaryActionButtons()`、対戦表示の退避は`hideBattlePresentation()`に集約します。
- 2P BATTLEは設定画面からVS／BATTLEへ入り、結果後はREMATCHまたはTITLEへ進みます。
- `?debug=1`はデバッグ一覧から通常のENDING／RESULT描画関数を呼びます。

## Battle flow

1. `beginBattle()`
   - 実行世代を更新
   - BGMと対戦画面状態を準備
   - NDC札を取得
2. `initBattle()`
   - 試合勝数とゲージを初期化
3. `startBattleRound()`
   - 11枚を配置し、10TURN分の札を準備
   - HP、コンボ、継続スキルをラウンド用に初期化
   - 必要なら初回チュートリアル
4. `startCountdown()` -> `nextRound()` -> `readDigits()`
   - ラウンドコール後に3桁を順に表示／読上げ
   - CPU回答を表示済み桁に応じて予約
5. `selectCard()`
   - 所有者をマウス／キーボード／CPUから決定
   - `handleCorrect()`または`handleMiss()`
6. `finishBattle()` / `completeBattleRound()`
   - K.O.、PERFECT、TIME UPを既存時間で処理
   - ラウンド勝者を記録
7. `showRoundWinScreen()`または`showBattleResult()`
   - ラウンド継続または試合結果へ進む

ダメージ、ゲージ、CPU反応値は`fighters_tuning.json`を正規化した`devTuning`と、`fighters_config.js`の難易度／キャラクター設定から計算します。

## タイマー所有関係

| 種別 | 主な変数 | 解除責務 |
| --- | --- | --- |
| 選択画面／VS | `selectVsTransitionTimer`、`vsAutoStartTimer`、`characterSelectSoundTimer` | `clearSelectVsTransition()` |
| ラウンド | `roundTimer`、`roundResultTimeout`、`battleFinishDelayTimer`、`roundWinDisplayTimer`、`timeDisplayInterval` | `clearRoundTimers()` |
| 読み上げ | `readingTimeouts` | `cancelReadingTimeouts()`。一時停止／再開は専用関数 |
| カウントダウン | `countdownTimeouts` | `cancelCountdown()` |
| カットイン | `skillCutinTimer`、`skillCutinPauseTimer`、`comboCutinTimer` | `clearRoundTimers()` |
| CPU | `cpuActionTimer`、`cpuClickTimer` | `clearCpuTimers()`。`clearRoundTimers()`からも呼ぶ |
| ギャラリー | `galleryEqualizerTimer` | `stopGalleryEqualizerMonitor()` |
| チュートリアル | `skillTutorialToastTimer`ほか | `clearRoundTimers()`／専用削除関数 |

画面を離れる経路は、対象に応じて`clearSelectVsTransition()`、`clearRoundTimers()`、`cancelCountdown()`を呼びます。演出時間の数値は静的定数または既存の呼出箇所に保持します。

## Result

### 戦闘ヒット演出

正解時のHP・ゲージ・コンボ更新は即時に行い、その後の見た目だけを
`playHitSequence()`と`HIT_FX`で制御します。約110ms後に命中補助音・
受け手のアイコン発光・ダメージ数値、260ms後にコンボカットインを表示します。
札は従来どおり520msで非表示、次TURNは1500ms、KO処理開始は1300msです。

HPトラックはHUD再生成時も同じノードを再利用します。内部HP値と分離した
transformアニメーションで実バーと残像を描画します。
`battleEffectTimers`と`battleEffectAnimations`は`clearBattleEffects()`が破棄し、
画面切替・ラウンド終了で呼び出します。`prefers-reduced-motion`では
振動・拡縮・HP補間を省き、数値・HP・コンボ情報は表示します。
音声の短い補助音は`audio_manager.js`の`playHitAccent()`で管理します。

結果処理は次の責務へ分かれています。

- `determineOutcome()`: 1ROUNDのHP／TURNによる勝敗
- `awardBattleRound()`: ラウンド勝数の加算
- `getMatchOutcome()` / `isMatchFinished()`: 2本先取の試合判定
- `getVictoryImagePath()` / `getBattleLine()`: 画像と台詞の決定
- `showBattleResult()`: 保存、ギャラリー解放、結果DOM描画
- `configureResultAction()`: REMATCH／NEXT BATTLE／ENDINGボタン
- `displayUsedCards()`: 使用札一覧

結果画面のレイアウト、台詞改行、次画面、解放条件はこの分離を越えて変更しません。

## Audio

`audio_manager.js`が音声の中心です。

- SEと数字読み上げは可能ならWeb Audio APIのbufferを使用
- buffer未準備またはAudioContext非対応時はHTML audio／生成Audioへフォールバック
- BGMは単一HTMLAudioElementで管理
- BGMフェードは`requestAnimationFrame`
- SOUND TESTのイコライザーは同じBGM要素を`AnalyserNode`へ接続
- VOICE A / Bは`karutaVoiceVariant`を共有
- preload対象、音量、loop、fade、playbackRateは`audio_manager.js`の既存値を維持

`fighters_game.js`の音声関数はゲームイベント名を音声APIへ渡す薄いfacadeです。音声APIがない場合に備えた既存フォールバックも維持します。

## Save data

### localStorage

| キー | 内容 |
| --- | --- |
| `karutaStoryProgressV1` | playerId、difficulty、stageIndex、phase、openingSceneIndex、endingSceneNumber、updatedAt |
| `karutaTutorialProgressV1` | 初回チュートリアル完了、キャラクター別SPECIALガイド表示済み |
| `karutaGalleryProgressV1` | cutins、victories、endings、artworksの解放アセットID |
| `karutaVoiceVariant` | `a`または`b` |
| `karutaTheme` | 現行ローダーが設定するテーマ |
| `karutaDevTuning` | `?devTune=1`時だけ利用する開発調整値 |

### sessionStorage

| キー | 内容 |
| --- | --- |
| `karutaSelectedMode` | 現行の`cpu`モード |
| `ndc_json_cache_v2` | 取得済みNDC札データ |

ストーリー保存はキャラクター確定、オープニング進行、VS、各試合結果、エンディング場面で更新します。通常のスタッフロール後、アートワーク判定へ進む時点で削除します。デバッグと2Pではストーリー保存を書きません。

## Gallery

- CUT-IN: 必殺技表示時に解放
- VICTORY: ラウンド勝利／試合結果表示時に解放
- OPENING / ENDING: 各ストーリー場面表示時に解放
- ARTWORK: ストーリークリア後に未解放からランダムで1枚解放
- SOUND TEST: BGM再生と周波数解析表示。解放保存の対象外

保存時は旧`.png` IDを`.webp`へ正規化し、既存プレイヤーの進捗を維持します。25枚すべて解放済みなら解放画面を出さずTITLEへ戻ります。

## Tutorial

- 通常STORYの最初の敵・最初のROUNDで、未完了の場合だけ自動開始
- `?debug=1`、デバッグ実画面、2Pでは自動開始しない
- HELPから任意に再実行できる
- 各キャラクターのSPECIALゲージが初めて最大になった時だけ補助表示
- 完了状態とキャラクター別表示済み状態は`karutaTutorialProgressV1`に保存

## キャラクター／敵を追加する

### プレイヤー

1. `fighters_config.js`の`players`へ追加
2. `character/`、`cutin/`、`opening/`、`vs/`、`vs_tate/`、`round/`、`victory/`、`victory_tate/`、`ending/`、`ending_tate/`へ素材追加
3. `ending/ending.md`へ2場面追加
4. `fighters_tuning.json`へ敵ごとの勝敗台詞追加
5. 新しい`skillType`の場合だけ`usePlayerSkill()`を拡張
6. ラウンド勝利音声が固有なら設定と音声対応を追加
7. デバッグ、ギャラリー、PC／縦画面で全経路確認

### 敵

1. `fighters_config.js`の`enemies`へステージ順に追加
2. 各画面素材を追加
3. `fighters_tuning.json`へ反応値・正答率・台詞追加
4. 新しい`skillType`の場合だけ`maybeActivateEnemySkill()`を拡張
5. VS、CPU、敗北結果、ラウンド勝利、デバッグ、ギャラリーを確認

## 変更後の回帰確認

### 静的確認

1. 全JavaScriptを`node --check`
2. `fighters_tuning.json`と`ndc.json`をJSON parse
3. `git diff --check`
4. HTMLの重複ID、JSのDOM参照先、設定アセットの存在を監査
5. タイミング定数、バランス値、保存キー、アセット参照の意図しない差分がないことを確認

### ブラウザ確認

- TITLE: STORY MODE、CONTINUE、2P BATTLE、GALLERY、HELP、PATCH NOTE、VOICE
- STORY: SELECT、OPENING、VS、全試合結果、ENDING、CREDIT、ARTWORK
- BATTLE: 読上げ、正誤、CPU、HP、ゲージ、コンボ、K.O.、PERFECT、TIME UP
- SKILL: 全プレイヤー／全敵
- SAVE: STORY、CONTINUE、クリア後削除、tutorial、gallery
- GALLERY: 全タブとSOUND TEST
- 2P: 設定、マウス、キーボード、勝敗、REMATCH
- VIEWPORT: PC、スマートフォン横、スマートフォン縦
- DEBUG: `index.html?debug=1`

## 保守上の注意

- `styles.css`は後段の上書きを含む大きなカスケードです。見た目の比較なしに規則を削除・移動しません。
- 動的DOMのID／class、localStorageキー、URLパラメータ、アセット名、公開API名は外部契約として扱います。
- `ignore/`、AppleDoubleファイル、`.DS_Store`はGitへ追加しません。
- 動作改善やデザイン改善は内部整理と同じ差分へ混ぜず、別の変更として扱います。
