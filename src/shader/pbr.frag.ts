export default `
precision highp float;
#define M_PI 3.1415926535897932384626433832795
#define NB_LIGHTS 4

in vec3 vNormalWS;
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
uniform bool diffuseIBL;

// From three.js
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}

// From three.js
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
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
// ** ** //



void
main()
{
  // **DO NOT** forget to do all your computation in linear space.
  vec3 albedo = sRGBToLinear(vec4(uMaterial.albedo, 1.0)).rgb;

  #define NB_LIGHTS 4
  vec3 lights[NB_LIGHTS] = vec3[NB_LIGHTS](
    vec3(-3.0, 3.0, 2.0)
    ,
    vec3(-3.0, -3.0, 2.0),
    vec3(3.0, 3.0, 2.0),
    vec3(3.0, -3.0, 2.0)
    );

  //float roughness = uMaterial.roughness * uMaterial.roughness;
  float roughness = pow(clamp(uMaterial.roughness, 0.05, 1.0), 2.0);
  //vec3 metallic = vec3(clamp(uMaterial.metallic, 0.05, 1.0));
  float metallic = clamp(uMaterial.metallic, 0.05, 1.0);

  vec3 f0 = mix(vec3(0.04), albedo, metallic);

  vec3 eyeDir = normalize(uCamera.position - vPosition);
  vec3 normal = normalize(vNormalWS);

  vec3 color = texture(diffuseTex, cartesianToPolar(normal)).rgb;

  float NoV = clamp(dot(normal, vPosition), 0.001, 1.0);
  float NoE = clamp(dot(normal, eyeDir), 0.001, 1.0);

  vec3 irradiance = vec3(0.0);
  for (int i = 0; i < NB_LIGHTS; i++)
  {
    vec3 lightPos = lights[i];
    vec3 lightDir = normalize(lightPos - vPosition);
    vec3 halfway = normalize(lightDir + eyeDir);

    float NoL = clamp(dot(normal, lightDir), 0.001, 1.0);
    float NoH = clamp(dot(normal, halfway), 0.001, 1.0);
    float EoH = clamp(dot(eyeDir, halfway), 0.001, 1.0);

    float D = D_GGX(NoH, roughness);
    vec3 kS = FresnelSchlick(EoH, f0);
    float G = G_GGX(NoE, NoL, roughness);

    vec3 DFG = (D * G) * kS;

    vec3 CookTorranceGGXSpecular = DFG / (4.0 * NoE * NoL);
    vec3 LambertianDiffuse = (1.0 - kS) * LambertianBRDF() * albedo;
    //vec3 DisneyDiffuse = (1.0 - kS) * Fd_Burley(NoV, NoL, LoH, roughness) * albedo;
    LambertianDiffuse *= (1.0 - metallic);

    irradiance += (LambertianDiffuse + CookTorranceGGXSpecular) * 1.0 * NoL;
  }

  if (diffuseIBL)
    outFragColor.rgba = LinearTosRGB(vec4(color, 1.0));
  else
    outFragColor.rgba = LinearTosRGB(vec4(irradiance, 1.0));

  // **DO NOT** forget to apply gamma correction as last step.
}
`;
