export default `
precision highp float;
#define M_PI 3.1415926535897932384626433832795
#define NB_LIGHTS 4

in vec3 vNormalWS;
in vec2 vUv;
in vec3 vPosition;
//in vec3 pLights[NB_LIGHTS];
out vec4 outFragColor;

const float RECIPROCAL_PI = 0.31830988618;
const float RECIPROCAL_PI2 = 0.15915494;

vec2 cartesianToPolar(vec3 n) {
    vec2 uv;
    uv.x = atan(n.z, n.x) * RECIPROCAL_PI2 + 0.5;
    uv.y = asin(n.y) * RECIPROCAL_PI + 0.5;
    return uv;
}

struct Material
{
  vec3 albedo;
  float roughness;
  float metallic;
};

struct Light
{
  vec3 position;
  float intensity;
  /* vec3 color; */
};

struct Camera
{
  vec3 position;
};

uniform Material uMaterial;
//uniform Light uLights[NB_LIGHTS]; 
uniform Camera uCamera;
uniform sampler2D diffuseTex;
uniform sampler2D specularTex;
uniform bool diffuseIBL;
uniform bool specularIBL;

uniform bool burleyDiffuse;
uniform bool orenNayarDiffuse;

// RUSTED IRON
uniform bool rustedIron;
uniform sampler2D albedo_mapRI;
uniform sampler2D normal_mapRI;
uniform sampler2D metallic_mapRI;
uniform sampler2D roughness_mapRI;

// From three.js
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}

// From three.js
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

vec4 RGBMtoRGB( in vec4 rgbm_color) {
  return vec4(rgbm_color.rgb * rgbm_color.a * 5.0, 1.0);
}

// Normal Distribution Function (NDF) to estimate the specular component
float D_GGX(float NoH, float roughness) {
  float a = NoH * roughness;
  float k = roughness / (1.0 - NoH * NoH + a * a);
  return k * k * (1.0 / M_PI);
}
float DGGX(float NoH, float roughness)
{
  float a2 = roughness * roughness;
  float NoH2 = NoH * NoH;
  float denom = NoH2 * (a2 - 1.0) + 1.0;
  return a2 / (M_PI * denom * denom);
}

// Geometric Shadowing (micro-facets)
float G_GGX(float NoV, float NoL, float k)
{
    float obstruction = NoV / (NoV * (1.0 - k) + k) ;
    float shadowing = NoL / (NoL * (1.0 - k) + k) ;
    return obstruction * shadowing;
}

// using f90 = 1.0
vec3 FresnelSchlick(float u, vec3 f0)
{
  float f = pow(1.0 - u, 5.0);
  return f + f0 * (1.0 - f);
}

// ** DIFFUSE BRDF ** //

// Lambertian diffuse optimised | Needs to be multiplied by the albedo to obtain BRDF
// (assuming uniform diffuse response over the micro-facets)
float LambertianBRDF()
{
  return 1.0 / M_PI;
}

// Disney BRDF expressed by Burley
float F_Schlick(float u, float f0, float f90) {
    return f0 + (f90 - f0) * pow(1.0 - u, 5.0);
}

float Fd_Burley(float NoV, float NoL, float LoH, float roughness) {
    float f90 = 0.5 + 2.0 * roughness * LoH * LoH;
    float lightScatter = F_Schlick(NoL, 1.0, f90);
    float viewScatter = F_Schlick(NoV, 1.0, f90);
    return lightScatter * viewScatter * (1.0 / M_PI);
}

vec3 Fd_OrenNayar(float LoE, float NoE, float NoL, float roughness, vec3 albedo)
{
  float s = LoE - NoL * NoE;
  float t = mix(1.0, max(NoL, NoE), step(0.0, s));

  vec3 A = 1.0 + roughness * (albedo / (roughness + 0.13) + 0.5 / (roughness + 0.33));
  float B = 0.45 * roughness / (roughness + 0.09);

  return albedo * max(0.0, NoL) * (A + B * s / t) / M_PI;
}
// ** ** //

// ** SPECULAR IBL ** //
vec2 roughness_uv(float roughness_level, vec2 uv)
{
  float offset = pow(2.0, roughness_level); // Roughness offset
  vec2 new_uv = vec2(0.0);
  new_uv.x = uv.x / offset;
  new_uv.y = (uv.y / (offset * 2.0)) + 1.0 - (1.0 / offset);
  return new_uv;
}

vec4 IBL_specular_mix(float roughness, vec2 uv, sampler2D specularTex)
{
  float low_level = floor(roughness * 5.0);
  float high_level = floor(roughness * 5.0) + 1.0;

  vec2 uv_low = roughness_uv(low_level, uv);
  vec2 uv_high = roughness_uv(high_level, uv);
  vec4 rgbm_specular_low = texture(specularTex, uv_low);
  vec4 rgbm_specular_high = texture(specularTex, uv_high);
  return mix(rgbm_specular_low, rgbm_specular_high, roughness * 5.0 - low_level);
}
// ** ** //

void
main()
{
  // **DO NOT** forget to do all your computation in linear space.
  vec3 albedo = sRGBToLinear(vec4(uMaterial.albedo, 1.0)).rgb;

  #define NB_LIGHTS 4
  vec3 lights[NB_LIGHTS] = vec3[NB_LIGHTS](
    vec3(-3.0, 3.0, 2.0),
    vec3(-3.0, -3.0, 2.0),
    vec3(3.0, 3.0, 2.0),
    vec3(3.0, -3.0, 2.0)
    );

  float roughness = uMaterial.roughness * uMaterial.roughness;
  float metallic = uMaterial.metallic;

  vec3 eyeDir = normalize(uCamera.position - vPosition);
  vec3 normal = normalize(vNormalWS);

  float NoV = clamp(dot(normal, vPosition), 0.001, 1.0);
  float NoE = clamp(dot(normal, eyeDir), 0.001, 1.0);

  vec3 albedoRI = sRGBToLinear(texture(albedo_mapRI, vUv)).rgb;
  vec3 roughnessRI = texture(roughness_mapRI, vUv).xyz;
  vec3 metallicRI = texture(metallic_mapRI, vUv).xyz;
  vec3 normalRI = texture(normal_mapRI, vUv).xyz;
  normalRI = normalize(normalRI * 2.0 - 1.0);

  if (rustedIron)
  {
    metallic = metallicRI.x * 0.99; // coeff is imagined material metallic value
    albedo = albedoRI;
    normal = normalRI;

    // coeff is imagined material roughness value
    // roughness should probably be less but here we are working with point lights
    // so this is the best way to have the ball a little lighten
    roughness = roughnessRI.y * 0.58;
  }

  vec3 f0 = mix(vec3(0.04), albedo, metallic);

  vec3 irradiance = vec3(0.0);
  vec3 gkS = vec3(0.0);
  for (int i = 0; i < NB_LIGHTS; i++)
  {
    vec3 lightPos = lights[i];
    vec3 lightDir = normalize(lightPos - vPosition);
    vec3 halfway = normalize(lightDir + eyeDir);

    float NoL = clamp(dot(normal, lightDir), 1e-10, 1.0);
    float NoH = clamp(dot(normalize(vNormalWS), halfway), 0.0001, 1.0);
    float EoH = clamp(dot(eyeDir, halfway), 0.0001, 1.0);

    float D = D_GGX(NoH, roughness);
    vec3 kS = FresnelSchlick(EoH, f0);
    float G = G_GGX(NoE, NoL, roughness);

    vec3 DFG = (D * G) * kS;

    vec3 CookTorranceGGXSpecular = DFG / (4.0 * NoE * NoL);
    vec3 LambertianDiffuse = (1.0 - kS) * LambertianBRDF() * albedo;
    LambertianDiffuse *= (1.0 - metallic);

    float LoH = clamp(dot(lightDir, halfway), 0.0001, 1.0);
    vec3 DisneyDiffuse = (1.0 - kS) * Fd_Burley(NoV, NoL, LoH, roughness) * albedo;
    DisneyDiffuse *= (1.0 - metallic);

    float LoE = clamp(dot(eyeDir, lightDir),  0.0001, 1.0);
    vec3 ONDiffuse = (1.0 - kS) * Fd_OrenNayar(LoE, NoE, NoL, roughness, albedo);
    ONDiffuse *= (1.0 - metallic);

    if (burleyDiffuse)
      irradiance += (DisneyDiffuse + CookTorranceGGXSpecular) * 1.0 * NoL;
    else if (orenNayarDiffuse)
      irradiance += (ONDiffuse +  CookTorranceGGXSpecular) * 1.0 * NoL;
    //else if (rustedIron)
      //irradiance += roughnessRI / 4.0;
    else
      irradiance += (LambertianDiffuse + CookTorranceGGXSpecular) * 1.0 * NoL;
    gkS += kS / 4.0;
  }

  if (!diffuseIBL && !specularIBL)
    outFragColor.rgba = LinearTosRGB(vec4(irradiance, 1.0));
  else
  {
    vec3 IBL = vec3(0.0);
    if (diffuseIBL)
    {
      vec4 rgbm_diffuse = texture(diffuseTex, cartesianToPolar(normal));
      vec3 IBL_diffuse = (1.0 - metallic) * RGBMtoRGB(rgbm_diffuse).rgb * albedo;
      IBL += IBL_diffuse;
    }
    if (specularIBL)
    {
      vec3 reflected_ray = reflect(-eyeDir, normal);
      vec2 uv = cartesianToPolar(reflected_ray);
      vec3 IBL_specular = RGBMtoRGB(IBL_specular_mix(roughness, uv, specularTex)).rgb;
      IBL += gkS * IBL_specular;
    }
    outFragColor.rgba = LinearTosRGB(vec4(IBL, 1.0));
  }

  // **DO NOT** forget to apply gamma correction as last step.
}
`;
