# Introducing Isotropic Level $\mathcal{I}$

We introduce an objective $\mathcal{I}$ that measures how close an elasticity tensor is to isotropic behavior. Intuitively, isotropic materials respond identically to deformation in every direction, while anisotropic materials exhibit direction-dependent stiffness. Our metric quantifies this notion by measuring the distance between a given elasticity tensor and the space of isotropic tensors.

Beyond serving as a diagnostic measure, $\mathcal{I}$ can also be used as an optimization objective. In topology optimization or microstructure design, minimizing this metric encourages the effective elasticity tensor to approach isotropy. In our recent work, we embed this objective into the design process of homogenization-based microstructures. Under our proposed design space, a CMA-ES optimizer typically converges within roughly 2000 iterations and successfully discovers microstructures whose homogenized elasticity tensors are nearly isotropic.

## Isotropic Elastic Tensor Normal Form

Elastic tensor in Voigt form:
$$
C =\begin{bmatrix}
C_{xxxx} & C_{xxyy} & C_{xxzz} & C_{xxyz} & C_{xxxz} & C_{xxxy} \\
C_{yyxx} & C_{yyyy} & C_{yyzz} & C_{yyyz} & C_{yyxz} & C_{yyxy} \\
C_{zzxx} & C_{zzyy} & C_{zzzz} & C_{zzyz} & C_{zzxz} & C_{zzxy} \\
C_{yzxx} & C_{yzyy} & C_{yzzz} & C_{yzyz} & C_{yzxz} & C_{yzxy} \\
C_{xzxx} & C_{xzyy} & C_{xzzz} & C_{xzyz} & C_{xzxz} & C_{xzxy} \\
C_{xyxx} & C_{xyyy} & C_{xyzz} & C_{xyyz} & C_{xyxz} & C_{xyxy}
\end{bmatrix}
$$
For isotropic materials:
$$
C_{ijkl} = \lambda \delta_{ij}\delta_{kl}
+ \mu (\delta_{ik}\delta_{jl}+\delta_{il}\delta_{jk})
$$
where

- $\lambda$ = first Lamé parameter
- $\mu$ = shear modulus
- $\delta_{ij}$ = Kronecker delta

Then, we can derive the normal form of isotropic elastic tensor in Voigt notation:
$$
\mathbf{C}_{\text{iso}}=
\begin{bmatrix}
\lambda+2\mu & \lambda & \lambda & 0 & 0 & 0\\
\lambda & \lambda+2\mu & \lambda & 0 & 0 & 0\\
\lambda & \lambda & \lambda+2\mu & 0 & 0 & 0\\
0 & 0 & 0 & \mu & 0 & 0\\
0 & 0 & 0 & 0 & \mu & 0\\
0 & 0 & 0 & 0 & 0 & \mu
\end{bmatrix}
$$

## Kelvin Representation

When computing tensor norms, directly using the Voigt representation leads to incorrect weighting of shear components. To preserve the correct tensor inner product, we use the Kelvin representation.

Define the strain vector in Kelvin form as:
$$
k =
\begin{bmatrix}
E_{xx} \\
E_{yy} \\
E_{zz} \\
\sqrt{2}E_{yz} \\
\sqrt{2}E_{xz} \\
\sqrt{2}E_{xy}
\end{bmatrix}
$$
With this definition,
$$
k^Tk = E:E
$$
For a fourth-order elasticity tensor, the conversion from Voigt to Kelvin form is
$$
C_k = D C D,
$$
where
$$
D = \operatorname{diag}(1,1,1,\sqrt{2},\sqrt{2},\sqrt{2}).
$$
This transformation ensures that the Frobenius norm of the matrix representation corresponds to the true tensor inner product.

## Isotropic Level

The set of isotropic elasticity tensors forms a **two-dimensional linear subspace** spanned by the volumetric and deviatoric projectors.

Define
$$
\mathbf{u} =
\frac{1}{\sqrt{3}}
\begin{bmatrix}
1 & 1 & 1 & 0 & 0 & 0
\end{bmatrix}^{T},
$$

$$
\mathbf{J} = \mathbf{u}\mathbf{u}^T,
\qquad
\mathbf{L} = \mathbf{I} - \mathbf{J},
$$

where $\mathbf{I}$ is the $6\times6$ identity matrix.
Here $\mathbf{J}$ projects onto the **volumetric strain direction**, while $\mathbf{L}$ projects onto the **deviatoric (shear) subspace**, and the two projectors are orthogonal.

Any isotropic elasticity tensor can therefore be written as
$$
C_{\mathrm{iso}} = 3\kappa\,\mathbf{J} + 2\mu\,\mathbf{L},
$$
where $\kappa$ and $\mu$ denote the bulk and shear moduli.

To obtain the isotropic tensor closest to a given elasticity tensor $C$, we project $C$ onto this subspace:
$$
C_{\mathrm{iso}}
=
\arg\min_{a,b}
\|C - a\mathbf{J} - b\mathbf{L}\|_F^2 .
$$
Because $\mathbf{J}$ and $\mathbf{L}$ are orthogonal, the optimal coefficients are
$$
a = \frac{\langle C,\mathbf{J}\rangle}{\langle \mathbf{J},\mathbf{J}\rangle},
\qquad
b = \frac{\langle C,\mathbf{L}\rangle}{\langle \mathbf{L},\mathbf{L}\rangle}.
$$
Evaluating the normalization constants $\langle J,J\rangle = 3$ and $\langle L,L\rangle = 10$ yields
$$
\kappa = \frac{\operatorname{tr}(\mathbf{J}C)}{3},
\qquad
\mu = \frac{\operatorname{tr}(\mathbf{L}C)}{10}.
$$
With these coefficients,
$$
C_{\mathrm{iso}} = 3\kappa\,\mathbf{J} + 2\mu\,\mathbf{L}
$$
is the orthogonal projection of $C$ onto the space of isotropic elasticity tensors, and thus the closest isotropic tensor to $C$ under the Kelvin/Frobenius inner product.

**Isotropic Level Metric:**

We define the isotropic level:
$$
\mathcal{I} =
\frac{\|C - C_{\mathrm{iso}}\|}{\|C\|},
$$
which measures the normalized distance between the elasticity tensor $C$ and its closest isotropic tensor $C_{\mathrm{iso}}$.

Key properties:

- $C_{\mathrm{iso}}$ is the closest isotropic tensor under the Kelvin/Frobenius norm.
- The norm is computed after converting tensors to Kelvin representation.
- The ratio makes the metric **scale invariant**.

$\mathcal{I}=0$ indicates a perfectly isotropic tensor, while larger values indicate increasing anisotropy.

## Implementation

first, eliminate the numerical error for the current elastic tensor $C_v$ via:

```cpp
const Mat6 Csym = 0.5f * (C + C.transpose());
```

then, convert elastic tensor $C_v$ from Voigt to Kevin representation:	

```cpp
Mat6 D = Mat6::Identity();
const float sqrt2 = std::sqrt(2.0f);
D(3, 3) = sqrt2;
D(4, 4) = sqrt2;
D(5, 5) = sqrt2;
const Mat6 Ck = D * Csym * D;
```

After finish constructing $C$, we then constructing $C_{img}$ using the steps mention in the preview section.

```cpp
// J = volumetric projector, L = deviatoric projector.
Vec6 u;
u << 1.0f, 1.0f, 1.0f, 0.0f, 0.0f, 0.0f;
u /= std::sqrt(3.0f);

const Mat6 J = u * u.transpose();
const Mat6 I = Mat6::Identity();
const Mat6 L = I - J;

// Closest isotropic tensor in Kelvin form:
// C_iso = 3*kappa*J + 2*mu*L
const float kappa = (J * Ck).trace() / 3.0f;
const float mu = (L * Ck).trace() / 10.0f;
const Mat6 Ck_iso = 3.0f * kappa * J + 2.0f * mu * L;
```

finally, we calculate the normalized Frobenius distance between $C$ and $C_{iso}$ and that will be the isotropic level we want.

```cpp
// Distance to isotropic subspace.
const float num = (Ck - Ck_iso).norm();
const float den = std::max(Ck.norm(), 1e-12f);

// 0 means perfectly isotropic. Larger means more anisotropic.
auto isotropic_level = num / den;
```

## Appendix

**Full Code in Cpp:**

```cpp
using Mat6 = Eigen::Matrix<float, 6, 6>;
using Vec6 = Eigen::Matrix<float, 6, 1>;

// Symmetrize numerically first.
const Mat6 Csym = 0.5f * (C + C.transpose());

// Convert Voigt -> Kelvin so Frobenius norm matches tensor inner product.
Mat6 D = Mat6::Identity();
const float sqrt2 = std::sqrt(2.0f);
D(3, 3) = sqrt2;
D(4, 4) = sqrt2;
D(5, 5) = sqrt2;
const Mat6 Ck = D * Csym * D;

// J = volumetric projector, L = deviatoric projector.
Vec6 u;
u << 1.0f, 1.0f, 1.0f, 0.0f, 0.0f, 0.0f;
u /= std::sqrt(3.0f);

const Mat6 J = u * u.transpose();
const Mat6 I = Mat6::Identity();
const Mat6 L = I - J;

// Closest isotropic tensor in Kelvin form:
// C_iso = 3*kappa*J + 2*mu*L
const float kappa = (J * Ck).trace() / 3.0f;
const float mu = (L * Ck).trace() / 10.0f;
const Mat6 Ck_iso = 3.0f * kappa * J + 2.0f * mu * L;

// Distance to isotropic subspace.
const float num = (Ck - Ck_iso).norm();
const float den = std::max(Ck.norm(), 1e-12f);

// 0 means perfectly isotropic. Larger means more anisotropic.
auto isotropic_level = num / den;
```

