import { GUI } from 'dat.gui';
import { mat4, vec3 } from 'gl-matrix';
import { Camera } from './camera';
//import { TriangleGeometry } from './geometries/triangle';
import { SphereGeometry } from './geometries/sphere';
import { PointLight } from './lights/lights';
import { Transform } from './transform';
import { GLContext } from './gl';
import { PBRShader } from './shader/pbr-shader';
import { Texture, Texture2D } from './textures/texture';
import { UniformType } from './types';

interface GUIProperties {
  albedo: number[];
}

/**
 * Class representing the current application with its state.
 *
 * @class Application
 */
class Application {
  /**
   * Context used to draw to the canvas
   *
   * @private
   */
  private _context: GLContext;

  private _shader: PBRShader;
  //private _geometry: TriangleGeometry;
  private _transformer: Transform;
  private _geometry1: SphereGeometry;
  private _geometry2: SphereGeometry;
  private _geometry3: SphereGeometry;
  private _geometry4: SphereGeometry;
  private _geometry5: SphereGeometry;
  private _geometry6: SphereGeometry;
  private _geometry7: SphereGeometry;
  private _geometry8: SphereGeometry;
  private _geometry9: SphereGeometry;
  private _plight: PointLight;

  private _uniforms: Record<string, UniformType | Texture>;

  private _textureExample: Texture2D<HTMLElement> | null;

  private _camera: Camera;

  /**
   * Object updated with the properties from the GUI
   *
   * @private
   */
  private _guiProperties: GUIProperties;

  constructor(canvas: HTMLCanvasElement) {
    console.log("canvas creation");
    this._context = new GLContext(canvas);
    this._camera = new Camera();

    this._geometry1 = new SphereGeometry(0.2, 32, 32);
    this._geometry2 = new SphereGeometry(0.2, 32, 32);
    this._geometry3 = new SphereGeometry(0.2, 32, 32);
    this._geometry4 = new SphereGeometry(0.2, 32, 32);
    this._geometry5 = new SphereGeometry(0.2, 32, 32);
    this._geometry6 = new SphereGeometry(0.2, 32, 32);
    this._geometry7 = new SphereGeometry(0.2, 32, 32);
    this._geometry8 = new SphereGeometry(0.2, 32, 32);
    this._geometry9 = new SphereGeometry(0.2, 32, 32);
    //this._geometry = new TriangleGeometry();

    this._transformer = new Transform();
    vec3.set(this._transformer.position, -0.5, 0.5, 0);
    this._geometry1.translate(this._transformer.combine());
    vec3.set(this._transformer.position, 0, 0.5, 0);
    this._geometry2.translate(this._transformer.combine());
    vec3.set(this._transformer.position, 0.5, 0.5, 0);
    this._geometry3.translate(this._transformer.combine());

    vec3.set(this._transformer.position, -0.5, 0, 0);
    this._geometry4.translate(this._transformer.combine());
    vec3.set(this._transformer.position, 0.5, 0, 0);
    this._geometry6.translate(this._transformer.combine());

    vec3.set(this._transformer.position, -0.5, -0.5, 0);
    this._geometry7.translate(this._transformer.combine());
    vec3.set(this._transformer.position, 0, -0.5, 0);
    this._geometry8.translate(this._transformer.combine());
    vec3.set(this._transformer.position, 0.5, -0.5, 0);
    this._geometry9.translate(this._transformer.combine());
    //this._geometry.vec_translate(vec3.set(vec3.create(), -0.5, 0.5, 0));

    this._plight = new PointLight();
    this._plight.setPosition(1, 1, 1);

    this._uniforms = {
      'uMaterial.albedo': vec3.create(),
      'uModel.localToProjection': mat4.create(),
      'uLight.position': this._plight.positionWS,
      // 'uLight.color': vec3.create()
    };

    this._shader = new PBRShader();
    this._textureExample = null;

    this._guiProperties = {
      albedo: [255, 255, 255]
    };

    this._createGUI();
    console.log("gui created");
  }

  /**
   * Initializes the application.
   */
  async init() {
    this._context.uploadGeometry(this._geometry1);
    this._context.uploadGeometry(this._geometry2);
    this._context.uploadGeometry(this._geometry3);
    this._context.uploadGeometry(this._geometry4);
    this._context.uploadGeometry(this._geometry5);
    this._context.uploadGeometry(this._geometry6);
    this._context.uploadGeometry(this._geometry7);
    this._context.uploadGeometry(this._geometry8);
    this._context.uploadGeometry(this._geometry9);
    this._context.compileProgram(this._shader);

    // Example showing how to load a texture and upload it to GPU.
    this._textureExample = await Texture2D.load(
      'assets/ggx-brdf-integrated.png'
    );
    if (this._textureExample !== null) {
      this._context.uploadTexture(this._textureExample);
      // You can then use it directly as a uniform:
      // ```uniforms.myTexture = this._textureExample;```
    }
  }

  /**
   * Called at every loop, before the [[Application.render]] method.
   */
  update() {
    /** Empty. */
  }

  /**
   * Called when the canvas size changes.
   */
  resize() {
    this._context.resize();
  }

  /**
   * Called at every loop, after the [[Application.update]] method.
   */
  render() {
    this._context.clear();
    this._context.setDepthTest(true);
    // this._context.setCulling(WebGL2RenderingContext.BACK);

    const aspect =
      this._context.gl.drawingBufferWidth /
      this._context.gl.drawingBufferHeight;

    const camera = this._camera;
    vec3.set(camera.transform.position, 0.0, 0.0, 2.0);
    camera.setParameters(aspect);
    camera.update();

    const props = this._guiProperties;

    // Set the color from the GUI into the uniform list.
    vec3.set(
      this._uniforms['uMaterial.albedo'] as vec3,
      props.albedo[0] / 255,
      props.albedo[1] / 255,
      props.albedo[2] / 255
    );
    // Sets the viewProjection matrix.
    // **Note**: if you want to modify the position of the geometry, you will
    // need to take the matrix of the mesh into account here.
    mat4.copy(
      this._uniforms['uModel.localToProjection'] as mat4,
      camera.localToProjection
    );

    // Draws the triangle.
    this._context.draw(this._geometry1, this._shader, this._uniforms);
    this._context.draw(this._geometry2, this._shader, this._uniforms);
    this._context.draw(this._geometry3, this._shader, this._uniforms);
    this._context.draw(this._geometry4, this._shader, this._uniforms);
    this._context.draw(this._geometry5, this._shader, this._uniforms);
    this._context.draw(this._geometry6, this._shader, this._uniforms);
    this._context.draw(this._geometry7, this._shader, this._uniforms);
    this._context.draw(this._geometry8, this._shader, this._uniforms);
    this._context.draw(this._geometry9, this._shader, this._uniforms);
  }

  /**
   * Creates a GUI floating on the upper right side of the page.
   *
   * ## Note
   *
   * You are free to do whatever you want with this GUI. It's useful to have
   * parameters you can dynamically change to see what happens.
   *
   *
   * @private
   */
  private _createGUI(): GUI {
    const gui = new GUI();
    gui.addColor(this._guiProperties, 'albedo');
    return gui;
  }
}

const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const app = new Application(canvas as HTMLCanvasElement);
app.init();

function animate() {
  app.update();
  app.render();
  window.requestAnimationFrame(animate);
}
animate();

/**
 * Handles resize.
 */

const resizeObserver = new ResizeObserver((entries) => {
  if (entries.length > 0) {
    const entry = entries[0];
    canvas.width = window.devicePixelRatio * entry.contentRect.width;
    canvas.height = window.devicePixelRatio * entry.contentRect.height;
    app.resize();
  }
});

resizeObserver.observe(canvas);
