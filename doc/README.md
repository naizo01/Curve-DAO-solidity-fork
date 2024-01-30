# Curve DAO 解説

Curve DAOで実装されている各コントラクトの概要と、それらがどのような処理を行っているのかを説明します。

背景として、Curve DAOコントラクト群は、Vyperで記述されていますが、最近Solidityに書き換える機会がありました。そこで学んだことを備忘録も兼ねてまとめていきます。

### CRVトークンのロックの意味
CRVはCurve Financeのガバナンストークンであり、流動性マイニングを通じて手に入れることができます。しかし、CRVトークンをそのまま保持しているだけでは、Curve DAO内でのガバナンス権やその他の利益を得ることはできません。CRVトークンを特定の期間ロックし、その対価としてveCRVトークンを受け取ることにより、以下のような効力を得ることができます。

1. **投票力**: veCRVの保有量に応じた投票力を得ることができます。これにより、Curve DAO内での意思決定に影響を与えることが可能になります。

2. **プロトコルからのFeeの一部**: プロトコルが得る手数料の50%をveCRVホルダーが受け取ることができます。

3. **Liquidity GaugeからのCRVブースト**: CRVトークンの報酬を増加させるブーストを受けることが可能になります。

### veCRVのメカニズム
veCRVは、CRVトークンをVotingEscrowコントラクトにロックすることでのみ得られる特別なトークンです。これは購入や譲渡ができない特性を持ち、ユーザーは自分の保有しているCRVトークンを選択可能な期間（最大4年）でロックすることによりveCRVトークンを得ることができます。veCRVの量は、ロックされるCRVの量とロック期間に基づいて計算され、時間が経つほど線形に減少します。

### CRVロックのインセンティブ
CRVをロックすることによる主なインセンティブは、Curve DAO内での影響力を増加させることです。veCRVを持つことにより、ユーザーはLiquidity GaugeのWeightを決定する権利を持つことになります。これにより、特定のプールがCRVトークンの排出量のどの程度を受け取るかを決定できます。したがって、ユーザーはCRVをロックすることで自分の投資を最大化するだけでなく、Curveエコシステム全体の方向性に影響を与えることができるのです。

### CRV供給量とその分配
CRVトークンの初期供給量は1.3億CRVで、最終的な供給量は3.03億CRVとされています。流動性提供者には62%が割り当てられており、流動性提供者が受け取るCRVの排出量は年々減少していきます。

### Liquidity Gaugeとブースティング
CRVトークンは、ユーザーが流動性を提供することによって配布されます。この配布量はLiquidity Gaugeによって測定され、ユーザーはLPトークンをLiquidity Gaugeにデポジットする必要があります。CRVの受け取り量は、Liquidity GaugeのWeightに基づいて決定され、veCRVの保有量に応じてブーストされます。これにより、veCRVの保有者は、より多くのCRV報酬を受け取ることができます。

## Curve DAO 各コントラクトの概要

まず、Curve DAOの全体構成を理解するために、それぞれのコントラクトの役割と機能について説明します。

### CRV.sol
CRV.solはERC-20標準に基づくトークンコントラクトです。供給量は時間が経つにつれて減少し、これによりインフレを防ぐ設計が施されています。CRVトークンの供給率は年間を通じて徐々に下がり、新規トークンの発行量を調整します。

### VotingEscrow.sol
VotingEscrow.solはCurve DAOで投票権を管理するコントラクトです。ユーザーはCRVトークンを一定期間ロックすることで、期間に応じた量の転送不可能なveCRVトークンを獲得します。これにより、Curve DAO内の投票に影響を与えることができます。ロック期間は最長4年で、長期ロックするほど大きな投票権が得られます。

### GaugeController.sol
GaugeControllerは流動性プールごとに設定されるゲージを管理し、CRVトークンの報酬分配を決定します。ユーザーは投票権を使って特定の流動性ゲージに投票し、その結果に基づいて報酬の配分が行われます。

### LiquidityGauge.sol
LiquidityGaugeコントラクトでは、ユーザーが流動性を提供するとCRVトークンの報酬を受け取る仕組みが実装されています。このコントラクトは提供された流動性の量と期間に基づいて報酬を計算し、Minterコントラクトを通じて報酬を配布します。

### Minter.sol
Minterコントラクトは、流動性提供に対する報酬としてCRVトークンを発行する役割を担います。ユーザーはこのコントラクトを通じて、流動性提供の対価としてCRVトークンを請求することが可能です。

### FeeDistributor.sol
FeeDistributorコントラクトは、Curve DAOの報酬分配システムを管理するためのスマートコントラクトです。このコントラクトは、ユーザーがVotingEscrowにてロックしたCRVトークンに基づいて報酬を分配します。報酬は週単位で計算され、分配されるトークンの量は、その週のCRVロック総量に比例して決定されます。

## 用語解説

### エポック（Epoch）
システムの状態が更新される特定の時点を指します。これは、ユーザーの投票権や流動性ゲージの状態が変更される際に、その変更を記録するために使用されるタイムスタンプです。エポックは、システム全体の歴史的な状態を追跡し、時間経過に伴う変更を管理するのに役立ちます。

### スロープ（Slope）
ユーザーの投票力が時間とともにどのように減少するかを示す指標です。具体的には、ユーザーがトークンをロックするときに設定され、ロックされたトークンの量とロック期間に基づいて計算されます。スロープは、投票権の減少率を表し、時間経過に伴う投票重みの変化を定量化します。

### チェックポイント（Checkpoint）
ユーザーのトークンロックや投票権の変更点を記録するために使用されるマーカーです。これは、ユーザーがトークンをロックしたり、ロックを解除したり、またはロック期間を変更したりする際に、その変更を正確に追跡するために重要です。チェックポイントを通じて、システムは過去の任意の時点でのユーザーの投票権を正確に計算することができます。

### バイアス（Bias）
特定の時点でのユーザーの投票重みを意味します。これは、ユーザーがトークンをロックすることで得られる初期の投票力を表し、時間が経過するにつれて徐々に減少します（スロープによって決定される）。バイアスは、ユーザーの投票権の現在の強度を示します。


## VotingEscrow コントラクト解説

ここからソースコードを参照しながら具体的な解説をして行こうかと思います。veCRVの仕組みの根幹となる、VotingEscrow.solの重要な部分のソースコードを参照しながら解説を行っていきます。

### ユーザーが操作する関数
指定された`VotingEscrow`コントラクト内の各ファンクションの簡単な解説です。

1. **`createLock(uint256 value_, uint256 unlockTime_)`**:
    - ユーザーが指定した量のトークン（`value_`）を特定の期間（`unlockTime_`まで）ロックするために使用されます。
    - ユーザーは新しいロックを作成する際にこの関数を呼び出し、トークンをVotingEscrowコントラクトに預けます。

2. **`depositFor(address addr_, uint256 value_)`**:
    - 他のユーザー（`addr_`）のためにトークン（`value_`）をロックするために使用されます。
    - この関数を使用することで、ユーザーは他のアカウントに代わってトークンをロックし、そのアカウントの投票権を増やすことができます。

3. **`increaseAmount(uint256 value_)`**:
    - 既存のロックにトークン（`value_`）を追加するために使用されます。
    - ユーザーはこの関数を通じて、ロック期間を変更せずにロックされているトークンの量を増やすことができます。

4. **`increaseUnlockTime(uint256 unlockTime_)`**:
    - 既存のロックの期間を延長するために使用されます。
    - ユーザーはこの関数を呼び出すことで、ロックされたトークンが解放される時刻（`unlockTime_`）を延長することができます。

5. **`withdraw()`**:
    - ユーザーがロックされたトークンを解放し、それを引き出すために使用されます。
    - ロック期間が終了した後にのみ、ユーザーはこの関数を呼び出してトークンを引き出すことができます。


これらの関数はユーザーによって実行され、チェックポイント(_checkpoint)処理を呼び出され、値の変更が行われます。
次は、チェックポイントを説明する前に、どのようにトークンロック情報がコントラクトに保存されているか説明します。

### グローバル変数

#### `Point`
```solidity
struct Point {
    int128 bias;
    int128 slope;
    uint256 ts;
    uint256 blk;
}
```
`Point`構造体はユーザーの投票重みを表現するために使用されます。
ここでの`bias`は特定の時点での投票重みを意味し、`slope`は時間経過による投票重みの減少率を表します。`ts`はタイムスタンプ、`blk`はブロック番号を指します。

#### `epoch`
- `epoch`は、グローバルなチェックポイント（時点）の数を追跡します。
- これは、コントラクト全体の状態が更新されるたびに増加します。例えば、ユーザーがトークンをロックしたり、解除したりするたびに、新しい`epoch`が作成されます。
- `epoch`は、コントラクトの状態を記録し、過去の任意の時点での全体の投票権を計算するために使用されます。

#### `userPointEpoch`
- `userPointEpoch`は、個々のユーザーに関連するチェックポイントの数を追跡します。
- これは、ユーザーがトークンをロックしたり、解除したりするたびに増加します。
- 各ユーザーの`userPointEpoch`は、そのユーザーの投票権がどのように時間とともに変化するかを示す個別のタイムラインを提供します。

#### `mapping`
ユーザーアドレス、`epoch`、`userPointEpoch`をKeyとしてmappingでPoint構造体はコントラクトに保存されています。

##### epoch -> Point
```solidity
mapping(uint256 => Point) public pointHistory;
```
##### UserAddress -> userPointEpoch ->Point
```solidity
mapping(address => mapping(uint256 => Point)) public userPointHistory;
```
##### UserAddress -> userPointEpoch
```solidity
mapping(address => uint256) public userPointEpoch;
```

#### slope

ユーザーの投票力（投票重み）が時間経過に伴ってどのように減少するかを追跡するためのマッピングです。このマッピングは、特定の時点での投票力の減少率（スロープの変化）を記録します。

##### epoch -> slope
```solidity
mapping(uint256 => int128) public slopeChanges;
```


### `_checkpoint`の解説

```solidity
function _checkpoint(
    address addr_,
    LockedBalance memory oldLocked_,
    LockedBalance memory newLocked_
) internal 
```

`_checkpoint`関数は、VotingEscrowコントラクト内で、ユーザーのトークンロック状況の変更を記録するために使用されます。主に、ユーザーがトークンをロックしたり、ロック期間を変更したり、ロックを解除したりする際に呼び出されます。internalで内部的に使用され、ユーザーのロック状況の変更毎に現在の投票重みを更新します。
この関数内の処理を順を追って見ていきます。


1. **既存のロック情報の計算**:
   - `oldLocked_`に基づいて、ユーザーの既存のロック状態を表す`Point`構造体（`_uOld`）の`slope`（傾き）と`bias`（バイアス）を計算します。
   - `slope`は、ロックされたトークン量を最大ロック可能期間（`MAXTIME`）で割った値です。
   - `bias`は、`slope`にロック終了までの残り時間を乗じた値です。

```solidity
if (oldLocked_.end > block.timestamp && oldLocked_.amount > 0) {
    unchecked {
        _uOld.slope = int128(oldLocked_.amount / int256(MAXTIME));
    }
    _uOld.bias =
        _uOld.slope *
        int128(uint128(oldLocked_.end - block.timestamp));
}
```

2. **新しいロック情報の計算**:
   - 同様に、`newLocked_`に基づいて、ユーザーの新しいロック状態を表す`Point`構造体（`_uNew`）の`slope`と`bias`を計算します。

```solidity
if (newLocked_.end > block.timestamp && newLocked_.amount > 0) {
    unchecked {
        _uNew.slope = int128(
            uint128(newLocked_.amount) / uint128(MAXTIME)
        );
    }
    _uNew.bias =
        _uNew.slope *
        int128(uint128(newLocked_.end - block.timestamp));
}
```

3. **スロープの変化の読み取り**:
   - `slopeChanges`マッピングを参照して、既存のロック終了時点（`oldLocked_.end`）と新しいロック終了時点（`newLocked_.end`）で予定されているスロープの変化を取得します。
   - これは、ロックされたトークンの減少率が時間とともにどのように変化するかを反映するために使用されます。

```solidity
_oldDSlope = slopeChanges[oldLocked_.end];
if (newLocked_.end != 0) {
    if (newLocked_.end == oldLocked_.end) {
        _newDSlope = _oldDSlope;
    } else {
        _newDSlope = slopeChanges[newLocked_.end];
    }
}
```

4. **最新の`Point`の初期化と更新**:
    - 最初に、`_lastPoint`という新しい`Point`構造体を作成し、初期値として現在のブロックタイムスタンプ（`block.timestamp`）とブロック番号（`block.number`）を設定します。
    - もし現在のエポック（`_epoch`）が0より大きい場合、`_lastPoint`は`pointHistory`マッピングから最新の`Point`情報（バイアス、スロープ、タイムスタンプ、ブロック番号）を取得して更新します。
```solidity
Point memory _lastPoint = Point({
    bias: 0,
    slope: 0,
    ts: block.timestamp,
    blk: block.number
});
if (_epoch > 0) {
    _lastPoint = Point({
        bias: pointHistory[_epoch].bias,
        slope: pointHistory[_epoch].slope,
        ts: pointHistory[_epoch].ts,
        blk: pointHistory[_epoch].blk
    });
}
uint256 _lastCheckpoint = _lastPoint.ts;
```


5. **`_initialLastPoint`の作成**:
    - `_lastPoint`のコピーとして`_initialLastPoint`を作成します。このステップは、後にブロック番号を計算するための基準点として使用されます。
```solidity
Point memory _initialLastPoint = Point({
    bias: _lastPoint.bias,
    slope: _lastPoint.slope,
    ts: _lastPoint.ts,
    blk: _lastPoint.blk
});

```

6. **ブロックスロープの計算**:
    - 現在のタイムスタンプが`_lastPoint`のタイムスタンプより新しい場合、ブロックスロープ（`_blockSlope`）を計算します。これは、ブロック番号の増加率をタイムスタンプの増加率で割ったもので、ブロック間隔の平均速度を示します。

```solidity
uint256 _blockSlope = 0;
if (block.timestamp > _lastPoint.ts) {
    _blockSlope =
        (MULTIPLIER * (block.number - _lastPoint.blk)) /
        (block.timestamp - _lastPoint.ts);
}
```

7. **週単位での履歴の更新**:
    - `_ti`は、計算の基準となる時間を保持します。この値は、最後のチェックポイント（`_lastCheckpoint`）から週単位に丸められています。
    - `_ti`に一週間ごとに時間を加算し、それぞれの週で投票パワーがどのように変化するかを計算します。このループは、最大255回実行されるか、`_ti`が現在のブロックタイムスタンプに達するまで続けられます。

```solidity
uint256 _ti;
unchecked {
    _ti = (_lastCheckpoint / WEEK) * WEEK;
}

for (uint256 i; i < 255; ) {
    _ti += WEEK;
    int128 _dSlope = 0;
    if (_ti > block.timestamp) {
        _ti = block.timestamp;
    } else {
        _dSlope = slopeChanges[_ti];
    }
```

8. **投票パワーの更新**:
    - 各週で、`_lastPoint`の`bias`と`slope`（投票パワーの傾斜）が更新されます。これは、時間経過による投票パワーの減少を反映しています。
    - `slopeChanges`マッピングから取得された`_dSlope`（スロープの変化量）を使用して、`_lastPoint`の`slope`を更新します。
```solidity
    _lastPoint.bias -=
        _lastPoint.slope *
        int128(uint128(_ti) - uint128(_lastCheckpoint));
    _lastPoint.slope += _dSlope;

    if (_lastPoint.bias < 0) {
        _lastPoint.bias = 0;
    }
    if (_lastPoint.slope < 0) {
        _lastPoint.slope = 0;
    }
```


9. **ブロック番号の計算と記録**:
    - 各更新時点でのブロック番号は、`_initialLastPoint`からのブロック間隔とタイムスタンプの増加率を基に推定されます。
    - これにより、将来の時点での投票パワーを計算する際の正確な基準点が確立されます。

```solidity
    _lastCheckpoint = _ti;
    _lastPoint.ts = _ti;
    _lastPoint.blk =
        _initialLastPoint.blk +
        (_blockSlope * (_ti - _initialLastPoint.ts)) /
        MULTIPLIER;

```

10. **エポックのインクリメントと履歴の保存**:
    - ループの各反復後に、エポック（`_epoch`）を1増加させ、更新された`_lastPoint`を`pointHistory`マッピングに保存します。

```solidity
    _epoch += 1;

    if (_ti == block.timestamp) {
        _lastPoint.blk = block.number;
        break;
    } else {
        pointHistory[_epoch] = Point({
            bias: _lastPoint.bias,
            slope: _lastPoint.slope,
            ts: _lastPoint.ts,
            blk: _lastPoint.blk
        });
    }
    unchecked {
        ++i;
    }
}
```

この関数は、VotingEscrowコントラクトの核となる部分であり、ユーザーの投票権がどのように時間とともに変化するかを正確に追跡するために重要です。投票重みの計算と更新は、Curve DAO内での投票とガバナンスにおいて中心的な役割を果たします。


