export default `

precision highp float;
#define NB_LIGHTS 4

in vec3 in_position;
in vec3 in_normal;
#ifdef USE_UV
  in vec2 in_uv;
#endif // USE_UV

/**
 * Varyings.
 */

out vec3 vNormalWS;
out vec3 vPosition;
out vec3 pLights[NB_LIGHTS];
#ifdef USE_UV
  out vec2 vUv;
#endif // USE_UV

/**
 * Uniforms List
 */

struct Model
{
  mat4 localToProjection;
};

uniform Model uModel;
uniform mat4 transformMat;

void
main()
{
  vec4 positionLocal = vec4(in_position, 1.0);
  gl_Position = uModel.localToProjection * positionLocal;
  vNormalWS = in_normal;
  vec4 WStoLocal = gl_Position * transformMat;
  vPosition = WStoLocal.xyz;
  //vPosition = gl_Position.xyz;
  //vec4 lights[NB_LIGHTS] = vec4[NB_LIGHTS](
  //  vec4(-3.0, 3.0, 5.0, 1.0)
  //  ,
  //  vec4(-3.0, -3.0, 5.0, 1.0),
  //  vec4(3.0, 3.0, 5.0, 1.0),
  //  vec4(3.0, -3.0, 5.0, 1.0)
  //  );
  //for (int i = 0; i < NB_LIGHTS; i++)
  //{
  //  lights[i] = lights[i] * transformMat;
  //}
  //pLights = vec3[NB_LIGHTS](
  //  lights[0].xyz,
  //  lights[1].xyz,
  //  lights[2].xyz,
  //  lights[3].xyz
  //);
}
`;
